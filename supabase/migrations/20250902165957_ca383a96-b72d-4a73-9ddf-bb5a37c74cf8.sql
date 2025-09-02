-- ===============================================
-- 🚀 SISTEMA ROBUSTO DE CÁLCULOS - CORREGIDO
-- Sin subqueries en condiciones WHEN de triggers
-- ===============================================

-- ===============================================
-- 1. FUNCIÓN PRINCIPAL DE RECÁLCULO COMPLETO V2
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
  dispatching_expense_type_id UUID;
  factoring_expense_type_id UUID;
  leasing_expense_type_id UUID;
BEGIN
  RAISE LOG '🔄 auto_recalculate_v2: Iniciando recálculo COMPLETO para conductor % en período %', 
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

  -- Obtener IDs de tipos de deducciones por porcentajes
  SELECT id INTO dispatching_expense_type_id 
  FROM expense_types 
  WHERE category = 'percentage_deduction' AND name ILIKE '%dispatch%' 
  LIMIT 1;
  
  SELECT id INTO factoring_expense_type_id 
  FROM expense_types 
  WHERE category = 'percentage_deduction' AND name ILIKE '%factor%' 
  LIMIT 1;
  
  SELECT id INTO leasing_expense_type_id 
  FROM expense_types 
  WHERE category = 'percentage_deduction' AND name ILIKE '%leas%' 
  LIMIT 1;

  -- ===============================================
  -- 2. GENERAR DEDUCCIONES AUTOMÁTICAS POR CARGA
  -- ===============================================
  
  -- Limpiar deducciones de porcentajes existentes para este período
  DELETE FROM expense_instances 
  WHERE payment_period_id = calculation_record.id
    AND user_id = target_driver_user_id
    AND expense_type_id IN (dispatching_expense_type_id, factoring_expense_type_id, leasing_expense_type_id);

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
    dispatching_amount := load_record.total_amount * (COALESCE(company_settings.default_dispatching_percentage, 5) / 100.0);
    factoring_amount := load_record.total_amount * (COALESCE(company_settings.default_factoring_percentage, 3) / 100.0);  
    leasing_amount := load_record.total_amount * (COALESCE(company_settings.default_leasing_percentage, 5) / 100.0);

    -- Insertar deducción por dispatching
    IF dispatching_amount > 0 AND dispatching_expense_type_id IS NOT NULL THEN
      INSERT INTO expense_instances (
        payment_period_id, user_id, expense_type_id, amount, description, 
        status, applied_at, applied_by, expense_date
      ) VALUES (
        calculation_record.id, target_driver_user_id, dispatching_expense_type_id,
        dispatching_amount,
        'Dispatching ' || COALESCE(company_settings.default_dispatching_percentage, 5) || '% - Carga #' || load_record.load_number,
        'applied', now(), target_driver_user_id, CURRENT_DATE
      );
    END IF;

    -- Insertar deducción por factoring  
    IF factoring_amount > 0 AND factoring_expense_type_id IS NOT NULL THEN
      INSERT INTO expense_instances (
        payment_period_id, user_id, expense_type_id, amount, description,
        status, applied_at, applied_by, expense_date
      ) VALUES (
        calculation_record.id, target_driver_user_id, factoring_expense_type_id,
        factoring_amount,
        'Factoring ' || COALESCE(company_settings.default_factoring_percentage, 3) || '% - Carga #' || load_record.load_number,
        'applied', now(), target_driver_user_id, CURRENT_DATE
      );
    END IF;

    -- Insertar deducción por leasing
    IF leasing_amount > 0 AND leasing_expense_type_id IS NOT NULL THEN
      INSERT INTO expense_instances (
        payment_period_id, user_id, expense_type_id, amount, description,
        status, applied_at, applied_by, expense_date
      ) VALUES (
        calculation_record.id, target_driver_user_id, leasing_expense_type_id,
        leasing_amount,
        'Leasing ' || COALESCE(company_settings.default_leasing_percentage, 5) || '% - Carga #' || load_record.load_number,
        'applied', now(), target_driver_user_id, CURRENT_DATE
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
-- 4. FUNCIONES DE TRIGGERS CORREGIDAS
-- ===============================================

-- 4.1 TRIGGERS PARA CARGAS
CREATE OR REPLACE FUNCTION trigger_auto_recalculate_on_loads()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.driver_user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL THEN
      PERFORM auto_recalculate_driver_payment_period_v2(NEW.driver_user_id, NEW.payment_period_id);
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    IF OLD.driver_user_id IS NOT NULL AND OLD.payment_period_id IS NOT NULL THEN
      PERFORM auto_recalculate_driver_payment_period_v2(OLD.driver_user_id, OLD.payment_period_id);
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4.2 TRIGGERS PARA COMBUSTIBLE  
CREATE OR REPLACE FUNCTION trigger_auto_recalculate_on_fuel()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
DECLARE
  company_payment_period_id UUID;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.driver_user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL THEN
      SELECT dpc.company_payment_period_id INTO company_payment_period_id
      FROM driver_period_calculations dpc WHERE dpc.id = NEW.payment_period_id;
      
      IF company_payment_period_id IS NOT NULL THEN
        PERFORM auto_recalculate_driver_payment_period_v2(NEW.driver_user_id, company_payment_period_id);
      END IF;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    IF OLD.driver_user_id IS NOT NULL AND OLD.payment_period_id IS NOT NULL THEN
      SELECT dpc.company_payment_period_id INTO company_payment_period_id
      FROM driver_period_calculations dpc WHERE dpc.id = OLD.payment_period_id;
      
      IF company_payment_period_id IS NOT NULL THEN
        PERFORM auto_recalculate_driver_payment_period_v2(OLD.driver_user_id, company_payment_period_id);
      END IF;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4.3 TRIGGERS PARA DEDUCCIONES
CREATE OR REPLACE FUNCTION trigger_auto_recalculate_on_expenses()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
DECLARE
  company_payment_period_id UUID;
  is_percentage_deduction BOOLEAN := FALSE;
BEGIN
  -- Verificar si es una deducción por porcentajes (automática)
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT et.category = 'percentage_deduction' INTO is_percentage_deduction
    FROM expense_types et WHERE et.id = NEW.expense_type_id;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT et.category = 'percentage_deduction' INTO is_percentage_deduction
    FROM expense_types et WHERE et.id = OLD.expense_type_id;
  END IF;
  
  -- Solo recalcular si NO es una deducción automática por porcentajes
  IF NOT COALESCE(is_percentage_deduction, FALSE) THEN
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
      IF NEW.user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL THEN
        SELECT dpc.company_payment_period_id INTO company_payment_period_id
        FROM driver_period_calculations dpc WHERE dpc.id = NEW.payment_period_id;
        
        IF company_payment_period_id IS NOT NULL THEN
          PERFORM auto_recalculate_driver_payment_period_v2(NEW.user_id, company_payment_period_id);
        END IF;
      END IF;
    END IF;
    
    IF TG_OP = 'DELETE' THEN
      IF OLD.user_id IS NOT NULL AND OLD.payment_period_id IS NOT NULL THEN
        SELECT dpc.company_payment_period_id INTO company_payment_period_id
        FROM driver_period_calculations dpc WHERE dpc.id = OLD.payment_period_id;
        
        IF company_payment_period_id IS NOT NULL THEN
          PERFORM auto_recalculate_driver_payment_period_v2(OLD.user_id, company_payment_period_id);
        END IF;
      END IF;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- 4.4 TRIGGERS PARA OTROS INGRESOS
CREATE OR REPLACE FUNCTION trigger_auto_recalculate_on_income()
RETURNS TRIGGER 
LANGUAGE plpgsql 
AS $$
DECLARE
  company_payment_period_id UUID;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    IF NEW.user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL THEN
      SELECT dpc.company_payment_period_id INTO company_payment_period_id
      FROM driver_period_calculations dpc WHERE dpc.id = NEW.payment_period_id;
      
      IF company_payment_period_id IS NOT NULL THEN
        PERFORM auto_recalculate_driver_payment_period_v2(NEW.user_id, company_payment_period_id);
      END IF;
    END IF;
  END IF;
  
  IF TG_OP = 'DELETE' THEN
    IF OLD.user_id IS NOT NULL AND OLD.payment_period_id IS NOT NULL THEN
      SELECT dpc.company_payment_period_id INTO company_payment_period_id
      FROM driver_period_calculations dpc WHERE dpc.id = OLD.payment_period_id;
      
      IF company_payment_period_id IS NOT NULL THEN
        PERFORM auto_recalculate_driver_payment_period_v2(OLD.user_id, company_payment_period_id);
      END IF;
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

-- Triggers para deducciones
CREATE TRIGGER trigger_auto_recalc_expenses_insert
  AFTER INSERT ON expense_instances
  FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_expenses();

CREATE TRIGGER trigger_auto_recalc_expenses_update
  AFTER UPDATE ON expense_instances
  FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_expenses();

CREATE TRIGGER trigger_auto_recalc_expenses_delete
  AFTER DELETE ON expense_instances  
  FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_expenses();

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
-- 6. CREAR TIPOS DE DEDUCCIONES SI NO EXISTEN
-- ===============================================

INSERT INTO expense_types (name, category, description, is_recurring, default_amount)
VALUES 
  ('Dispatching Fee', 'percentage_deduction', 'Comisión por despacho de cargas', false, 0),
  ('Factoring Fee', 'percentage_deduction', 'Comisión por factoraje', false, 0),
  ('Leasing Fee', 'percentage_deduction', 'Renta de equipo', false, 0)
ON CONFLICT (name) DO NOTHING;

-- ===============================================
-- 7. PROBAR EL SISTEMA CON DATOS EXISTENTES
-- ===============================================

-- Ejecutar recálculo para el conductor existente
SELECT auto_recalculate_driver_payment_period_v2(
  '484d83b3-b928-46b3-9705-db225ddb9b0c'::UUID,
  '49cb0343-7af4-4df0-b31e-75380709c58e'::UUID
);

-- Verificar resultados
SELECT 
    'SISTEMA ROBUSTO IMPLEMENTADO' as status,
    dpc.gross_earnings,
    dpc.total_deductions,
    dpc.fuel_expenses,
    dpc.other_income,
    dpc.net_payment,
    dpc.has_negative_balance,
    dpc.updated_at
FROM driver_period_calculations dpc 
WHERE dpc.driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
AND dpc.company_payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e';