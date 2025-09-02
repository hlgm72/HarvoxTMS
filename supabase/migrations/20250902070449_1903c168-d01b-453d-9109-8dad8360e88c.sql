-- =================================================
-- 🚨 ARREGLO CRÍTICO: SISTEMA DE RECÁLCULO AUTOMÁTICO
-- =================================================
-- Problema: No hay triggers en tabla 'loads' y hay triggers duplicados

-- 1️⃣ LIMPIAR TRIGGERS DUPLICADOS EN expense_instances
DROP TRIGGER IF EXISTS auto_recalculate_expense_instances_trigger ON expense_instances;
DROP TRIGGER IF EXISTS auto_recalculate_expense_trigger ON expense_instances; 
DROP TRIGGER IF EXISTS expense_instances_recalculate_totals ON expense_instances;
DROP TRIGGER IF EXISTS trigger_auto_recalc_expenses ON expense_instances;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_expenses_delete ON expense_instances;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_expenses_insert ON expense_instances;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_expenses_update ON expense_instances;

-- 2️⃣ LIMPIAR TRIGGERS DUPLICADOS EN fuel_expenses  
DROP TRIGGER IF EXISTS auto_recalc_fuel_expenses ON fuel_expenses;
DROP TRIGGER IF EXISTS auto_recalc_fuel_expenses_trigger ON fuel_expenses;
DROP TRIGGER IF EXISTS auto_recalculate_fuel_expenses_trigger ON fuel_expenses;
DROP TRIGGER IF EXISTS auto_recalculate_fuel_trigger ON fuel_expenses;
DROP TRIGGER IF EXISTS trigger_auto_recalc_fuel ON fuel_expenses;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_fuel_delete ON fuel_expenses;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_fuel_insert ON fuel_expenses;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_fuel_update ON fuel_expenses;

-- 3️⃣ CREAR FUNCIÓN UNIFICADA DE RECÁLCULO AUTOMÁTICO
CREATE OR REPLACE FUNCTION auto_recalculate_driver_payment_period(
  driver_id UUID,
  period_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calculation_id UUID;
  total_gross_earnings NUMERIC := 0;
  total_fuel_expenses NUMERIC := 0; 
  total_deductions NUMERIC := 0;
  total_other_income NUMERIC := 0;
  calculated_net_payment NUMERIC := 0;
  calculated_total_income NUMERIC := 0;
  has_negative_balance BOOLEAN := false;
BEGIN
  -- Validar parámetros
  IF driver_id IS NULL OR period_id IS NULL THEN
    RAISE LOG '⚠️ auto_recalculate_driver_payment_period: Parámetros nulos - driver_id: %, period_id: %', driver_id, period_id;
    RETURN;
  END IF;

  -- Buscar el driver_period_calculation_id correspondiente
  SELECT dpc.id INTO calculation_id
  FROM driver_period_calculations dpc
  WHERE dpc.driver_user_id = driver_id
    AND dpc.company_payment_period_id = period_id;

  -- Si no existe, crear uno nuevo
  IF calculation_id IS NULL THEN
    INSERT INTO driver_period_calculations (
      driver_user_id,
      company_payment_period_id,
      gross_earnings,
      fuel_expenses,
      total_deductions,
      other_income,
      total_income,
      net_payment,
      payment_status,
      has_negative_balance
    ) VALUES (
      driver_id,
      period_id,
      0, 0, 0, 0, 0, 0,
      'calculated',
      false
    ) RETURNING id INTO calculation_id;
    
    RAISE LOG '✅ auto_recalculate_driver_payment_period: Creado nuevo cálculo % para conductor % período %', calculation_id, driver_id, period_id;
  END IF;

  -- 📊 CALCULAR INGRESOS BRUTOS (de cargas asignadas)
  SELECT COALESCE(SUM(l.total_amount), 0) INTO total_gross_earnings
  FROM loads l
  WHERE l.driver_user_id = driver_id
    AND l.payment_period_id = period_id
    AND l.status != 'cancelled';

  -- 📊 CALCULAR GASTOS DE COMBUSTIBLE
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO total_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = driver_id
    AND fe.payment_period_id = calculation_id;

  -- 📊 CALCULAR DEDUCCIONES TOTALES
  SELECT COALESCE(SUM(ei.amount), 0) INTO total_deductions
  FROM expense_instances ei
  WHERE ei.user_id = driver_id
    AND ei.payment_period_id = calculation_id
    AND ei.status = 'applied';

  -- 📊 CALCULAR OTROS INGRESOS
  SELECT COALESCE(SUM(oi.amount), 0) INTO total_other_income
  FROM other_income oi
  WHERE oi.driver_user_id = driver_id
    AND oi.payment_period_id = calculation_id
    AND oi.status = 'approved';

  -- 📊 CALCULAR TOTALES FINALES
  calculated_total_income := total_gross_earnings + total_other_income;
  calculated_net_payment := calculated_total_income - total_fuel_expenses - total_deductions;
  has_negative_balance := calculated_net_payment < 0;

  -- 💾 ACTUALIZAR CÁLCULO
  UPDATE driver_period_calculations SET
    gross_earnings = total_gross_earnings,
    fuel_expenses = total_fuel_expenses,
    total_deductions = total_deductions,
    other_income = total_other_income,
    total_income = calculated_total_income,
    net_payment = calculated_net_payment,
    has_negative_balance = has_negative_balance,
    updated_at = now()
  WHERE id = calculation_id;

  RAISE LOG '✅ auto_recalculate_driver_payment_period: Recálculo completado - Conductor: %, Período: %, Bruto: %, Neto: %', 
    driver_id, period_id, total_gross_earnings, calculated_net_payment;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '❌ auto_recalculate_driver_payment_period ERROR: % - Conductor: %, Período: %', SQLERRM, driver_id, period_id;
END;
$$;

-- 4️⃣ CREAR TRIGGERS PARA LA TABLA LOADS (¡CRÍTICO!)
CREATE OR REPLACE FUNCTION trigger_recalculate_on_loads_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_driver_id UUID;
  affected_period_id UUID;
  old_driver_id UUID;
  old_period_id UUID;
BEGIN
  -- Para INSERT y UPDATE usamos NEW
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    affected_driver_id := NEW.driver_user_id;
    affected_period_id := NEW.payment_period_id;
    
    -- Para UPDATE también considerar valores OLD si cambiaron
    IF TG_OP = 'UPDATE' THEN
      old_driver_id := OLD.driver_user_id;
      old_period_id := OLD.payment_period_id;
      
      -- Si cambió el conductor o período, recalcular ambos
      IF old_driver_id IS DISTINCT FROM NEW.driver_user_id OR 
         old_period_id IS DISTINCT FROM NEW.payment_period_id THEN
        
        -- Recalcular período anterior si existe
        IF old_driver_id IS NOT NULL AND old_period_id IS NOT NULL THEN
          PERFORM auto_recalculate_driver_payment_period(old_driver_id, old_period_id);
          RAISE LOG '🔄 trigger_recalculate_on_loads_change: Recálculo OLD - Conductor: %, Período: %', old_driver_id, old_period_id;
        END IF;
      END IF;
    END IF;
    
    -- Recalcular período actual si existe
    IF affected_driver_id IS NOT NULL AND affected_period_id IS NOT NULL THEN
      PERFORM auto_recalculate_driver_payment_period(affected_driver_id, affected_period_id);
      RAISE LOG '🔄 trigger_recalculate_on_loads_change: Recálculo NEW - Conductor: %, Período: %', affected_driver_id, affected_period_id;
    END IF;
    
    RETURN NEW;
  END IF;

  -- Para DELETE usamos OLD
  IF TG_OP = 'DELETE' THEN
    affected_driver_id := OLD.driver_user_id;
    affected_period_id := OLD.payment_period_id;
    
    IF affected_driver_id IS NOT NULL AND affected_period_id IS NOT NULL THEN
      PERFORM auto_recalculate_driver_payment_period(affected_driver_id, affected_period_id);
      RAISE LOG '🔄 trigger_recalculate_on_loads_change: Recálculo DELETE - Conductor: %, Período: %', affected_driver_id, affected_period_id;
    END IF;
    
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- 5️⃣ CREAR TRIGGERS EN LA TABLA LOADS
CREATE TRIGGER loads_auto_recalculate_trigger
  AFTER INSERT OR UPDATE OR DELETE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_on_loads_change();

-- 6️⃣ RECREAR TRIGGERS LIMPIOS PARA OTRAS TABLAS
CREATE TRIGGER expense_instances_auto_recalculate_trigger
  AFTER INSERT OR UPDATE OR DELETE ON expense_instances
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_on_expense_instances();

CREATE TRIGGER fuel_expenses_auto_recalculate_trigger
  AFTER INSERT OR UPDATE OR DELETE ON fuel_expenses
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_on_fuel_expenses();