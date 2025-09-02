-- Corregir warning de seguridad agregando search_path seguro
DROP FUNCTION IF EXISTS auto_recalculate_driver_payment_period_v2(uuid, uuid);

CREATE OR REPLACE FUNCTION auto_recalculate_driver_payment_period_v2(
  target_driver_user_id UUID,
  target_period_id UUID
) RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = 'public'
AS $$
DECLARE
  calculation_record RECORD;
  aggregated_totals RECORD;
  calculation_exists BOOLEAN := FALSE;
BEGIN
  -- Log de inicio
  RAISE NOTICE '🔄 v2.4-UPSERT: Iniciando recálculo con UPSERT para conductor % en período %', target_driver_user_id, target_period_id;

  -- Verificar si ya existe el cálculo
  SELECT EXISTS(
    SELECT 1 
    FROM driver_period_calculations dpc 
    WHERE dpc.driver_user_id = target_driver_user_id 
    AND dpc.company_payment_period_id = target_period_id
  ) INTO calculation_exists;

  -- Obtener los totales agregados de cargas (sin other_income)
  SELECT 
    COALESCE(SUM(l.total_amount), 0) as gross_earnings,
    COUNT(l.id) as load_count
  INTO aggregated_totals
  FROM loads l
  WHERE l.driver_user_id = target_driver_user_id
    AND l.payment_period_id = target_period_id
    AND l.status != 'cancelled';

  -- UPSERT en driver_period_calculations
  INSERT INTO driver_period_calculations (
    driver_user_id,
    company_payment_period_id,
    gross_earnings,
    other_income,
    fuel_expenses,
    total_deductions,
    total_income,
    net_payment,
    has_negative_balance,
    payment_status,
    calculated_at,
    calculated_by
  ) VALUES (
    target_driver_user_id,
    target_period_id,
    aggregated_totals.gross_earnings,
    0, -- other_income siempre en 0 por ahora
    (
      SELECT COALESCE(SUM(fe.total_amount), 0)
      FROM fuel_expenses fe
      WHERE fe.driver_user_id = target_driver_user_id
        AND fe.payment_period_id IN (
          SELECT dpc2.id 
          FROM driver_period_calculations dpc2 
          WHERE dpc2.company_payment_period_id = target_period_id 
            AND dpc2.driver_user_id = target_driver_user_id
        )
    ),
    (
      SELECT COALESCE(SUM(ei.amount), 0)
      FROM expense_instances ei
      WHERE ei.user_id = target_driver_user_id
        AND ei.payment_period_id IN (
          SELECT dpc3.id 
          FROM driver_period_calculations dpc3 
          WHERE dpc3.company_payment_period_id = target_period_id 
            AND dpc3.driver_user_id = target_driver_user_id
        )
        AND ei.status = 'applied'
    ),
    aggregated_totals.gross_earnings, -- total_income inicial
    aggregated_totals.gross_earnings, -- net_payment inicial
    FALSE,
    'calculated',
    now(),
    NULL
  )
  ON CONFLICT (driver_user_id, company_payment_period_id)
  DO UPDATE SET
    gross_earnings = EXCLUDED.gross_earnings,
    other_income = EXCLUDED.other_income,
    fuel_expenses = EXCLUDED.fuel_expenses,
    total_deductions = EXCLUDED.total_deductions,
    total_income = EXCLUDED.gross_earnings + EXCLUDED.other_income,
    net_payment = EXCLUDED.gross_earnings + EXCLUDED.other_income - EXCLUDED.fuel_expenses - EXCLUDED.total_deductions,
    has_negative_balance = (EXCLUDED.gross_earnings + EXCLUDED.other_income - EXCLUDED.fuel_expenses - EXCLUDED.total_deductions) < 0,
    calculated_at = now(),
    updated_at = now();

  RAISE NOTICE '✅ v2.4-UPSERT: Recálculo completado para conductor %', target_driver_user_id;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: Error en recálculo v2.4-UPSERT: %', SQLERRM;
END;
$$;