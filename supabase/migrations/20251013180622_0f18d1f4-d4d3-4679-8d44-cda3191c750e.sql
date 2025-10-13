-- ========================================
-- Fix security warnings: Set search_path en funciones
-- ========================================

CREATE OR REPLACE FUNCTION get_period_description(
  period_id UUID,
  expense_type_name TEXT
) RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  period_start DATE;
  period_end DATE;
  period_freq TEXT;
  week_num INTEGER;
  year_num INTEGER;
  period_label TEXT;
BEGIN
  -- Obtener datos del período
  SELECT 
    period_start_date, 
    period_end_date,
    period_frequency
  INTO period_start, period_end, period_freq
  FROM company_payment_periods
  WHERE id = period_id;
  
  -- Generar etiqueta según frecuencia
  IF period_freq = 'weekly' THEN
    week_num := EXTRACT(WEEK FROM period_start);
    year_num := EXTRACT(YEAR FROM period_start);
    period_label := 'W' || week_num || '/' || year_num;
  ELSIF period_freq = 'biweekly' THEN
    week_num := EXTRACT(WEEK FROM period_start);
    year_num := EXTRACT(YEAR FROM period_start);
    period_label := 'BW' || week_num || '/' || year_num;
  ELSIF period_freq = 'monthly' THEN
    period_label := TO_CHAR(period_start, 'MM/YYYY');
  ELSE
    period_label := 'Period';
  END IF;
  
  -- Formato: "Factoring fee for W41/2025 (10/06 - 10/12)"
  RETURN expense_type_name || ' for ' || period_label || 
         ' (' || TO_CHAR(period_start, 'MM/DD') || 
         ' - ' || TO_CHAR(period_end, 'MM/DD') || ')';
END;
$$;

CREATE OR REPLACE FUNCTION recalculate_period_percentage_deductions(
  target_period_id UUID,
  target_user_id UUID
) RETURNS VOID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_factoring_total NUMERIC := 0;
  v_dispatching_total NUMERIC := 0;
  v_leasing_total NUMERIC := 0;
  v_company_id UUID;
  v_factoring_type_id UUID := '1a3355f5-1a3b-49d6-89b4-acc7f259ebdb';
  v_dispatching_type_id UUID := '9e5a38ae-8851-4a8c-9bc7-11ac32cb7b10';
  v_leasing_type_id UUID := '28d59af7-c756-40bf-885e-fb995a744003';
BEGIN
  -- Obtener company_id
  SELECT company_id INTO v_company_id
  FROM company_payment_periods
  WHERE id = target_period_id;
  
  -- Eliminar deducciones por porcentaje existentes del período
  DELETE FROM expense_instances
  WHERE payment_period_id = target_period_id
    AND user_id = target_user_id
    AND expense_type_id IN (v_factoring_type_id, v_dispatching_type_id, v_leasing_type_id);
  
  -- Calcular sumas totales de TODAS las cargas del período para este usuario
  SELECT
    COALESCE(SUM(ROUND(total_amount * COALESCE(factoring_percentage, 0) / 100, 2)), 0),
    COALESCE(SUM(ROUND(total_amount * COALESCE(dispatching_percentage, 0) / 100, 2)), 0),
    COALESCE(SUM(ROUND(total_amount * COALESCE(leasing_percentage, 0) / 100, 2)), 0)
  INTO v_factoring_total, v_dispatching_total, v_leasing_total
  FROM loads
  WHERE driver_user_id = target_user_id
    AND payment_period_id = target_period_id
    AND status != 'cancelled';
  
  -- Crear instancia de Factoring si aplica
  IF v_factoring_total > 0 THEN
    INSERT INTO expense_instances (
      user_id,
      expense_type_id,
      amount,
      expense_date,
      description,
      payment_period_id,
      created_by
    ) VALUES (
      target_user_id,
      v_factoring_type_id,
      v_factoring_total,
      (SELECT period_start_date FROM company_payment_periods WHERE id = target_period_id),
      get_period_description(target_period_id, 'Factoring fee'),
      target_period_id,
      auth.uid()
    )
    ON CONFLICT (payment_period_id, expense_type_id, user_id) 
    DO UPDATE SET
      amount = EXCLUDED.amount,
      description = EXCLUDED.description,
      updated_at = now();
  END IF;
  
  -- Crear instancia de Dispatching si aplica
  IF v_dispatching_total > 0 THEN
    INSERT INTO expense_instances (
      user_id,
      expense_type_id,
      amount,
      expense_date,
      description,
      payment_period_id,
      created_by
    ) VALUES (
      target_user_id,
      v_dispatching_type_id,
      v_dispatching_total,
      (SELECT period_start_date FROM company_payment_periods WHERE id = target_period_id),
      get_period_description(target_period_id, 'Dispatching fee'),
      target_period_id,
      auth.uid()
    )
    ON CONFLICT (payment_period_id, expense_type_id, user_id) 
    DO UPDATE SET
      amount = EXCLUDED.amount,
      description = EXCLUDED.description,
      updated_at = now();
  END IF;
  
  -- Crear instancia de Leasing si aplica
  IF v_leasing_total > 0 THEN
    INSERT INTO expense_instances (
      user_id,
      expense_type_id,
      amount,
      expense_date,
      description,
      payment_period_id,
      created_by
    ) VALUES (
      target_user_id,
      v_leasing_type_id,
      v_leasing_total,
      (SELECT period_start_date FROM company_payment_periods WHERE id = target_period_id),
      get_period_description(target_period_id, 'Leasing fee'),
      target_period_id,
      auth.uid()
    )
    ON CONFLICT (payment_period_id, expense_type_id, user_id) 
    DO UPDATE SET
      amount = EXCLUDED.amount,
      description = EXCLUDED.description,
      updated_at = now();
  END IF;
END;
$$;