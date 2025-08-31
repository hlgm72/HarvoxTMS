-- =====================================
-- CORRECCIÓN: Funciones seguras con permisos correctos
-- =====================================

-- Corregir la función auto_recalculate_on_fuel_expenses con security definer y search_path
CREATE OR REPLACE FUNCTION auto_recalculate_on_fuel_expenses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  company_period_id UUID;
BEGIN
  -- Obtener el company_payment_period_id correcto
  IF TG_OP = 'DELETE' THEN
    company_period_id := OLD.payment_period_id;
  ELSE
    company_period_id := NEW.payment_period_id;
  END IF;
  
  -- Recalcular TODOS los driver_period_calculations de este company_payment_period
  PERFORM recalculate_payment_period_totals(company_period_id);
  
  RAISE LOG 'auto_recalculate_on_fuel_expenses: Recálculo ejecutado para company_period %', company_period_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Corregir la función recalculate_payment_period_totals con security definer y search_path
CREATE OR REPLACE FUNCTION recalculate_payment_period_totals(period_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Actualizar fuel_expenses para todos los conductores en este período
  UPDATE driver_period_calculations 
  SET 
    fuel_expenses = (
      SELECT COALESCE(SUM(fe.total_amount), 0) 
      FROM fuel_expenses fe 
      WHERE fe.payment_period_id = period_id  -- Este es el company_payment_period_id
        AND fe.driver_user_id = driver_period_calculations.driver_user_id
    ),
    updated_at = now()
  WHERE company_payment_period_id = period_id;
  
  -- Recalcular net_payment = gross_earnings + other_income - fuel_expenses - total_deductions
  UPDATE driver_period_calculations 
  SET 
    net_payment = gross_earnings + other_income - fuel_expenses - total_deductions,
    updated_at = now()
  WHERE company_payment_period_id = period_id;
  
  RAISE LOG 'Recalculated totals for period %', period_id;
END;
$$;