-- ===============================================
-- 🚀 SISTEMA ROBUSTO DE CÁLCULOS DE PAGOS v2.0
-- Incluye deducciones automáticas por porcentajes de cargas
-- ===============================================

-- ===============================================
-- 1. FUNCIÓN PRINCIPAL DE RECÁLCULO COMPLETO
-- ===============================================

CREATE OR REPLACE FUNCTION auto_recalculate_driver_payment_period_v2(
  target_driver_user_id UUID,
  target_company_payment_period_id UUID
) RETURNS VOID 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  load_record RECORD;
  calculation_record RECORD;
  company_settings RECORD;
  dispatching_amount NUMERIC := 0;
  factoring_amount NUMERIC := 0;
  leasing_amount NUMERIC := 0;
  total_load_deductions NUMERIC := 0;
BEGIN
  RAISE LOG '🔄 auto_recalculate_driver_payment_period_v2: Iniciando recálculo COMPLETO para conductor % en período %', 
    target_driver_user_id, target_company_payment_period_id;

  -- Obtener el registro de cálculo
  SELECT * INTO calculation_record
  FROM driver_period_calculations dpc
  WHERE dpc.driver_user_id = target_driver_user_id
    AND dpc.company_payment_period_id = target_company_payment_period_id;
  
  IF calculation_record IS NULL THEN
    RAISE LOG '❌ No se encontró registro de cálculo para conductor % en período %',
      target_driver_user_id, target_company_payment_period_id;
    RETURN;
  END IF;

  -- Obtener configuración de la empresa
  SELECT 
    c.default_dispatching_percentage,
    c.default_factoring_percentage, 
    c.default_leasing_percentage
  INTO company_settings
  FROM company_payment_periods cpp
  JOIN companies c ON cpp.company_id = c.id
  WHERE cpp.id = target_company_payment_period_id;

  -- ===============================================
  -- 2. GENERAR DEDUCCIONES AUTOMÁTICAS POR CARGA
  -- ===============================================
  
  -- Limpiar deducciones de porcentajes existentes para este período
  DELETE FROM expense_instances 
  WHERE payment_period_id = calculation_record.id
    AND user_id = target_driver_user_id
    AND expense_type_id IN (
      SELECT id FROM expense_types 
      WHERE category = 'percentage_deduction'
    );

  -- Procesar cada carga y generar deducciones
  FOR load_record IN 
    SELECT l.*
    FROM loads l
    WHERE l.driver_user_id = target_driver_user_id
      AND l.payment_period_id = target_company_payment_period_id
      AND l.status NOT IN ('cancelled', 'rejected')
      AND l.total_amount > 0
  LOOP
    -- Calcular deducciones por porcentajes para esta carga
    dispatching_amount := load_record.total_amount * (COALESCE(company_settings.default_dispatching_percentage, 5) / 100);
    factoring_amount := load_record.total_amount * (COALESCE(company_settings.default_factoring_percentage, 3) / 100);  
    leasing_amount := load_record.total_amount * (COALESCE(company_settings.default_leasing_percentage, 5) / 100);

    -- Insertar deducción por dispatching
    IF dispatching_amount > 0 THEN
      INSERT INTO expense_instances (
        payment_period_id,
        user_id,
        expense_type_id,
        amount,
        description,
        status,
        applied_at,
        applied_by,
        expense_date
      ) VALUES (
        calculation_record.id,
        target_driver_user_id,
        (SELECT id FROM expense_types WHERE category = 'percentage_deduction' AND name ILIKE '%dispatch%' LIMIT 1),
        dispatching_amount,
        'Dispatching ' || COALESCE(company_settings.default_dispatching_percentage, 5) || '% - Carga #' || load_record.load_number,
        'applied',
        now(),
        target_driver_user_id,
        CURRENT_DATE
      );
    END IF;

    -- Insertar deducción por factoring  
    IF factoring_amount > 0 THEN
      INSERT INTO expense_instances (
        payment_period_id,
        user_id,
        expense_type_id,
        amount,
        description,
        status,
        applied_at,
        applied_by,
        expense_date
      ) VALUES (
        calculation_record.id,
        target_driver_user_id,
        (SELECT id FROM expense_types WHERE category = 'percentage_deduction' AND name ILIKE '%factor%' LIMIT 1),
        factoring_amount,
        'Factoring ' || COALESCE(company_settings.default_factoring_percentage, 3) || '% - Carga #' || load_record.load_number,
        'applied',
        now(),
        target_driver_user_id,
        CURRENT_DATE
      );
    END IF;

    -- Insertar deducción por leasing
    IF leasing_amount > 0 THEN
      INSERT INTO expense_instances (
        payment_period_id,
        user_id,
        expense_type_id,
        amount,
        description,
        status,
        applied_at,
        applied_by,
        expense_date
      ) VALUES (
        calculation_record.id,
        target_driver_user_id,
        (SELECT id FROM expense_types WHERE category = 'percentage_deduction' AND name ILIKE '%leas%' LIMIT 1),
        leasing_amount,
        'Leasing ' || COALESCE(company_settings.default_leasing_percentage, 5) || '% - Carga #' || load_record.load_number,
        'applied',
        now(),
        target_driver_user_id,
        CURRENT_DATE
      );
    END IF;

    total_load_deductions := total_load_deductions + dispatching_amount + factoring_amount + leasing_amount;
    
    RAISE LOG '✅ Deducciones generadas para carga #%: Dispatching=%, Factoring=%, Leasing=%',
      load_record.load_number, dispatching_amount, factoring_amount, leasing_amount;
  END LOOP;

  -- ===============================================
  -- 3. CALCULAR TODOS LOS TOTALES
  -- ===============================================
  
  UPDATE driver_period_calculations 
  SET 
    -- Ingresos brutos (suma de todas las cargas)
    gross_earnings = (
      SELECT COALESCE(SUM(l.total_amount), 0)
      FROM loads l
      WHERE l.driver_user_id = target_driver_user_id
        AND l.payment_period_id = target_company_payment_period_id
        AND l.status NOT IN ('cancelled', 'rejected')
    ),
    -- Otros ingresos
    other_income = (
      SELECT COALESCE(SUM(oi.amount), 0)
      FROM other_income oi
      WHERE oi.user_id = target_driver_user_id
        AND oi.payment_period_id = calculation_record.id
    ),
    -- Gastos de combustible
    fuel_expenses = (
      SELECT COALESCE(SUM(fe.total_amount), 0)
      FROM fuel_expenses fe
      WHERE fe.driver_user_id = target_driver_user_id
        AND fe.payment_period_id = calculation_record.id
    ),
    -- TODAS las deducciones (porcentajes + recurrentes + eventuales)
    total_deductions = (
      SELECT COALESCE(SUM(ei.amount), 0)
      FROM expense_instances ei
      WHERE ei.user_id = target_driver_user_id
        AND ei.payment_period_id = calculation_record.id
        AND ei.status = 'applied'
    ),
    updated_at = now()
  WHERE driver_user_id = target_driver_user_id
    AND company_payment_period_id = target_company_payment_period_id;

  -- Actualizar campos calculados finales
  UPDATE driver_period_calculations 
  SET 
    total_income = gross_earnings + other_income,
    net_payment = (gross_earnings + other_income) - fuel_expenses - total_deductions,
    has_negative_balance = ((gross_earnings + other_income) - fuel_expenses - total_deductions) < 0,
    updated_at = now()
  WHERE driver_user_id = target_driver_user_id
    AND company_payment_period_id = target_company_payment_period_id;

  RAISE LOG '✅ RECÁLCULO COMPLETO TERMINADO: Conductor=%, Período=%, Deducciones por cargas=%',
    target_driver_user_id, target_company_payment_period_id, total_load_deductions;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '❌ ERROR en recálculo completo: % - Conductor: %, Período: %', 
    SQLERRM, target_driver_user_id, target_company_payment_period_id;
END;
$$;

-- ===============================================
-- 4. TRIGGERS PARA RECÁLCULO AUTOMÁTICO
-- ===============================================

-- Función helper para obtener datos del conductor y período
CREATE OR REPLACE FUNCTION get_driver_period_from_load(load_record RECORD)
RETURNS RECORD 
LANGUAGE plpgsql
AS $$
DECLARE
  result RECORD;
BEGIN
  SELECT 
    load_record.driver_user_id,
    load_record.payment_period_id as company_payment_period_id
  INTO result;
  
  RETURN result;
END;
$$;

-- ===============================================
-- 4.1 TRIGGERS PARA CARGAS (loads)
-- ===============================================

CREATE OR REPLACE FUNCTION trigger_auto_recalculate_on_loads()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
DECLARE
  driver_data RECORD;
BEGIN
  -- Para INSERT y UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.driver_user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL THEN
      PERFORM auto_recalculate_driver_payment_period_v2(NEW.driver_user_id, NEW.payment_period_id);
    END IF;
  END IF;
  
  -- Para DELETE  
  IF TG_OP = 'DELETE' THEN
    IF OLD.driver_user_id IS NOT NULL AND OLD.payment_period_id IS NOT NULL THEN
      PERFORM auto_recalculate_driver_payment_period_v2(OLD.driver_user_id, OLD.payment_period_id);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ===============================================  
-- 4.2 TRIGGERS PARA COMBUSTIBLE (fuel_expenses)
-- ===============================================

CREATE OR REPLACE FUNCTION trigger_auto_recalculate_on_fuel()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
  -- Para INSERT y UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.driver_user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL THEN
      -- Obtener el company_payment_period_id desde driver_period_calculations
      PERFORM auto_recalculate_driver_payment_period_v2(
        NEW.driver_user_id,
        (SELECT company_payment_period_id FROM driver_period_calculations WHERE id = NEW.payment_period_id)
      );
    END IF;
  END IF;
  
  -- Para DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.driver_user_id IS NOT NULL AND OLD.payment_period_id IS NOT NULL THEN
      PERFORM auto_recalculate_driver_payment_period_v2(
        OLD.driver_user_id,
        (SELECT company_payment_period_id FROM driver_period_calculations WHERE id = OLD.payment_period_id)
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ===============================================
-- 4.3 TRIGGERS PARA DEDUCCIONES (expense_instances)  
-- ===============================================

CREATE OR REPLACE FUNCTION trigger_auto_recalculate_on_expenses()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
  -- Para INSERT y UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL THEN
      PERFORM auto_recalculate_driver_payment_period_v2(
        NEW.user_id,
        (SELECT company_payment_period_id FROM driver_period_calculations WHERE id = NEW.payment_period_id)
      );
    END IF;
  END IF;
  
  -- Para DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.user_id IS NOT NULL AND OLD.payment_period_id IS NOT NULL THEN
      PERFORM auto_recalculate_driver_payment_period_v2(
        OLD.user_id,
        (SELECT company_payment_period_id FROM driver_period_calculations WHERE id = OLD.payment_period_id)
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ===============================================
-- 4.4 TRIGGERS PARA OTROS INGRESOS (other_income)
-- ===============================================

CREATE OR REPLACE FUNCTION trigger_auto_recalculate_on_income()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
  -- Para INSERT y UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL THEN
      PERFORM auto_recalculate_driver_payment_period_v2(
        NEW.user_id,
        (SELECT company_payment_period_id FROM driver_period_calculations WHERE id = NEW.payment_period_id)
      );
    END IF;
  END IF;
  
  -- Para DELETE
  IF TG_OP = 'DELETE' THEN
    IF OLD.user_id IS NOT NULL AND OLD.payment_period_id IS NOT NULL THEN
      PERFORM auto_recalculate_driver_payment_period_v2(
        OLD.user_id,
        (SELECT company_payment_period_id FROM driver_period_calculations WHERE id = OLD.payment_period_id)
      );
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ===============================================
-- 5. CREAR TODOS LOS TRIGGERS
-- ===============================================

-- Limpiar triggers existentes
DROP TRIGGER IF EXISTS trigger_auto_recalc_loads_insert ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalc_loads_update ON loads;  
DROP TRIGGER IF EXISTS trigger_auto_recalc_loads_delete ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalc_fuel_insert ON fuel_expenses;
DROP TRIGGER IF EXISTS trigger_auto_recalc_fuel_update ON fuel_expenses;
DROP TRIGGER IF EXISTS trigger_auto_recalc_fuel_delete ON fuel_expenses;
DROP TRIGGER IF EXISTS trigger_auto_recalc_expenses_insert ON expense_instances;
DROP TRIGGER IF EXISTS trigger_auto_recalc_expenses_update ON expense_instances;
DROP TRIGGER IF EXISTS trigger_auto_recalc_expenses_delete ON expense_instances;
DROP TRIGGER IF EXISTS trigger_auto_recalc_income_insert ON other_income;
DROP TRIGGER IF EXISTS trigger_auto_recalc_income_update ON other_income;
DROP TRIGGER IF EXISTS trigger_auto_recalc_income_delete ON other_income;

-- Triggers para cargas
CREATE TRIGGER trigger_auto_recalc_loads_insert
  AFTER INSERT ON loads
  FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_loads();

CREATE TRIGGER trigger_auto_recalc_loads_update  
  AFTER UPDATE ON loads
  FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_loads();

CREATE TRIGGER trigger_auto_recalc_loads_delete
  AFTER DELETE ON loads
  FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_loads();

-- Triggers para combustible
CREATE TRIGGER trigger_auto_recalc_fuel_insert
  AFTER INSERT ON fuel_expenses
  FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_fuel();

CREATE TRIGGER trigger_auto_recalc_fuel_update
  AFTER UPDATE ON fuel_expenses  
  FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_fuel();

CREATE TRIGGER trigger_auto_recalc_fuel_delete
  AFTER DELETE ON fuel_expenses
  FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_fuel();

-- Triggers para deducciones (SOLO para deducciones manuales, no automáticas)
CREATE TRIGGER trigger_auto_recalc_expenses_insert
  AFTER INSERT ON expense_instances
  FOR EACH ROW 
  WHEN (NEW.expense_type_id NOT IN (SELECT id FROM expense_types WHERE category = 'percentage_deduction'))
  EXECUTE FUNCTION trigger_auto_recalculate_on_expenses();

CREATE TRIGGER trigger_auto_recalc_expenses_update
  AFTER UPDATE ON expense_instances
  FOR EACH ROW 
  WHEN (NEW.expense_type_id NOT IN (SELECT id FROM expense_types WHERE category = 'percentage_deduction'))
  EXECUTE FUNCTION trigger_auto_recalculate_on_expenses();

CREATE TRIGGER trigger_auto_recalc_expenses_delete
  AFTER DELETE ON expense_instances  
  FOR EACH ROW 
  WHEN (OLD.expense_type_id NOT IN (SELECT id FROM expense_types WHERE category = 'percentage_deduction'))
  EXECUTE FUNCTION trigger_auto_recalculate_on_expenses();

-- Triggers para otros ingresos
CREATE TRIGGER trigger_auto_recalc_income_insert
  AFTER INSERT ON other_income
  FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_income();

CREATE TRIGGER trigger_auto_recalc_income_update
  AFTER UPDATE ON other_income
  FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_income();

CREATE TRIGGER trigger_auto_recalc_income_delete
  AFTER DELETE ON other_income
  FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_income();

-- ===============================================
-- 6. FUNCIÓN DE PRUEBA COMPLETA
-- ===============================================

-- Crear tipos de deducciones si no existen
INSERT INTO expense_types (name, category, description, is_recurring, default_amount)
VALUES 
  ('Dispatching Fee', 'percentage_deduction', 'Comisión por despacho de cargas', false, 0),
  ('Factoring Fee', 'percentage_deduction', 'Comisión por factoraje', false, 0),
  ('Leasing Fee', 'percentage_deduction', 'Renta de equipo', false, 0)
ON CONFLICT (name) DO NOTHING;