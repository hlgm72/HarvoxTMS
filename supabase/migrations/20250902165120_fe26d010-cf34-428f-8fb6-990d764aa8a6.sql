-- ===============================================
-- ✅ ACTUALIZAR FUNCIÓN CORREGIDA
-- Usar la lógica del recálculo directo que funcionó
-- ===============================================

CREATE OR REPLACE FUNCTION auto_recalculate_driver_payment_period(
  target_driver_user_id UUID,
  target_company_payment_period_id UUID
) RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  RAISE LOG '🔄 auto_recalculate_driver_payment_period: Iniciando recálculo para conductor % en período %', 
    target_driver_user_id, target_company_payment_period_id;

  -- Recálculo usando la lógica que funcionó
  UPDATE driver_period_calculations 
  SET 
    gross_earnings = (
      SELECT COALESCE(SUM(l.total_amount), 0)
      FROM loads l
      WHERE l.driver_user_id = target_driver_user_id
        AND l.payment_period_id = target_company_payment_period_id
        AND l.status NOT IN ('cancelled', 'rejected')
    ),
    other_income = (
      SELECT COALESCE(SUM(oi.amount), 0)
      FROM other_income oi
      WHERE oi.user_id = target_driver_user_id
        AND oi.payment_period_id = driver_period_calculations.id
    ),
    fuel_expenses = (
      SELECT COALESCE(SUM(fe.total_amount), 0)
      FROM fuel_expenses fe
      WHERE fe.driver_user_id = target_driver_user_id
        AND fe.payment_period_id = driver_period_calculations.id
    ),
    total_deductions = (
      SELECT COALESCE(SUM(ei.amount), 0)
      FROM expense_instances ei
      WHERE ei.user_id = target_driver_user_id
        AND ei.payment_period_id = driver_period_calculations.id
        AND ei.status = 'applied'
    ),
    updated_at = now()
  WHERE driver_user_id = target_driver_user_id
    AND company_payment_period_id = target_company_payment_period_id;

  -- Actualizar campos calculados
  UPDATE driver_period_calculations 
  SET 
    total_income = gross_earnings + other_income,
    net_payment = (gross_earnings + other_income) - fuel_expenses - total_deductions,
    has_negative_balance = ((gross_earnings + other_income) - fuel_expenses - total_deductions) < 0,
    updated_at = now()
  WHERE driver_user_id = target_driver_user_id
    AND company_payment_period_id = target_company_payment_period_id;

  RAISE LOG '✅ auto_recalculate_driver_payment_period COMPLETADO para conductor % en período %',
    target_driver_user_id, target_company_payment_period_id;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '❌ auto_recalculate_driver_payment_period ERROR: % - Conductor: %, Período: %', 
    SQLERRM, target_driver_user_id, target_company_payment_period_id;
END;
$$;