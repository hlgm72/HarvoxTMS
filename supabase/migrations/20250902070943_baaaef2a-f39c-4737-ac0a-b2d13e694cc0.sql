-- ===============================================
-- 🚨 CORRECCIÓN CRÍTICA: Sistema de Recálculos Automáticos
-- Arreglar nombres de columnas incorrectos en auto_recalculate_driver_payment_period
-- ===============================================

-- 1. ELIMINAR función con errores
DROP FUNCTION IF EXISTS auto_recalculate_driver_payment_period(UUID, UUID);

-- 2. RECREAR función corregida con nombres de columnas correctos
CREATE OR REPLACE FUNCTION auto_recalculate_driver_payment_period(
  target_driver_user_id UUID,
  target_period_id UUID
) RETURNS VOID AS $$
DECLARE
  total_loads_amount NUMERIC := 0;
  total_fuel_expenses NUMERIC := 0;
  total_other_income NUMERIC := 0;
  total_deductions NUMERIC := 0;
  net_payment_amount NUMERIC := 0;
  total_income_amount NUMERIC := 0;
  negative_balance BOOLEAN := false;
BEGIN
  -- Log inicio del recálculo
  RAISE LOG '🔄 auto_recalculate_driver_payment_period: Iniciando recálculo para conductor % en período %', 
    target_driver_user_id, target_period_id;

  -- 1. CALCULAR INGRESOS DE CARGAS
  SELECT COALESCE(SUM(l.total_amount), 0) INTO total_loads_amount
  FROM loads l
  WHERE l.driver_user_id = target_driver_user_id
    AND l.payment_period_id = target_period_id
    AND l.status NOT IN ('cancelled', 'rejected');

  RAISE LOG '🚚 auto_recalculate_driver_payment_period: Encontradas cargas por $%', total_loads_amount;

  -- 2. CALCULAR GASTOS DE COMBUSTIBLE
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO total_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = target_driver_user_id
    AND fe.payment_period_id = target_period_id;

  RAISE LOG '⛽ auto_recalculate_driver_payment_period: Encontrados gastos de combustible por $%', total_fuel_expenses;

  -- 3. CALCULAR OTROS INGRESOS (CORREGIR: usar oi.user_id NO oi.driver_user_id)
  SELECT COALESCE(SUM(oi.amount), 0) INTO total_other_income
  FROM other_income oi
  WHERE oi.user_id = target_driver_user_id  -- ✅ CORREGIDO: user_id en lugar de driver_user_id
    AND oi.payment_period_id = target_period_id;

  RAISE LOG '💰 auto_recalculate_driver_payment_period: Encontrados otros ingresos por $%', total_other_income;

  -- 4. CALCULAR DEDUCCIONES (CORREGIR: usar ei.user_id)
  SELECT COALESCE(SUM(ei.amount), 0) INTO total_deductions
  FROM expense_instances ei
  WHERE ei.user_id = target_driver_user_id  -- ✅ CORREGIDO: user_id en lugar de driver_user_id
    AND ei.payment_period_id = target_period_id
    AND ei.status = 'applied';

  RAISE LOG '💸 auto_recalculate_driver_payment_period: Encontradas deducciones por $%', total_deductions;

  -- 5. CALCULAR TOTALES
  total_income_amount := total_loads_amount + total_other_income;
  net_payment_amount := total_income_amount - total_fuel_expenses - total_deductions;
  negative_balance := net_payment_amount < 0;

  -- 6. ACTUALIZAR driver_period_calculations
  UPDATE driver_period_calculations
  SET 
    gross_earnings = total_loads_amount,
    other_income = total_other_income,
    fuel_expenses = total_fuel_expenses,
    total_deductions = total_deductions,
    total_income = total_income_amount,
    net_payment = net_payment_amount,
    has_negative_balance = negative_balance,
    updated_at = now()
  WHERE driver_user_id = target_driver_user_id
    AND company_payment_period_id = target_period_id;

  -- Log completion
  RAISE LOG '✅ auto_recalculate_driver_payment_period COMPLETADO: conductor=%, período=%, cargas=$%, combustible=$%, otros_ingresos=$%, deducciones=$%, neto=$%',
    target_driver_user_id, target_period_id, total_loads_amount, total_fuel_expenses, total_other_income, total_deductions, net_payment_amount;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '❌ auto_recalculate_driver_payment_period ERROR: % - Conductor: %, Período: %', 
    SQLERRM, target_driver_user_id, target_period_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. VERIFICAR que los triggers estén correctos
-- Ya están creados en migraciones anteriores, solo verificamos que existan

-- Log de verificación
DO $$
BEGIN
  -- Verificar trigger en loads
  IF EXISTS (
    SELECT 1 FROM information_schema.triggers 
    WHERE trigger_name = 'loads_auto_recalculate_trigger'
  ) THEN
    RAISE LOG '✅ Trigger loads_auto_recalculate_trigger existe';
  ELSE
    RAISE LOG '❌ Trigger loads_auto_recalculate_trigger NO existe';
  END IF;

  -- Verificar función de trigger
  IF EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'trigger_recalculate_on_loads_change'
  ) THEN
    RAISE LOG '✅ Función trigger_recalculate_on_loads_change existe';
  ELSE
    RAISE LOG '❌ Función trigger_recalculate_on_loads_change NO existe';
  END IF;
END $$;