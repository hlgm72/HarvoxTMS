-- ===============================================
-- 🚀 SISTEMA ROBUSTO DE CÁLCULOS - FINAL CORREGIDO
-- ===============================================

-- ===============================================
-- 1. CREAR TIPOS DE DEDUCCIONES (sin ON CONFLICT)
-- ===============================================

-- Insertar tipos de deducciones solo si no existen
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM expense_types WHERE name = 'Dispatching Fee') THEN
    INSERT INTO expense_types (name, category, description) 
    VALUES ('Dispatching Fee', 'percentage_deduction', 'Comisión por despacho de cargas');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM expense_types WHERE name = 'Factoring Fee') THEN
    INSERT INTO expense_types (name, category, description) 
    VALUES ('Factoring Fee', 'percentage_deduction', 'Comisión por factoraje');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM expense_types WHERE name = 'Leasing Fee') THEN
    INSERT INTO expense_types (name, category, description) 
    VALUES ('Leasing Fee', 'percentage_deduction', 'Renta de equipo');
  END IF;
END $$;

-- ===============================================
-- 2. FUNCIÓN PRINCIPAL DE RECÁLCULO ROBUSTO
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
  RAISE LOG '🚀 SISTEMA ROBUSTO v2: Iniciando recálculo COMPLETO para conductor % en período %', 
    target_driver_user_id, target_company_payment_period_id;

  -- Obtener el registro de cálculo del conductor
  SELECT * INTO calculation_record
  FROM driver_period_calculations dpc
  WHERE dpc.driver_user_id = target_driver_user_id
    AND dpc.company_payment_period_id = target_company_payment_period_id;
  
  IF calculation_record IS NULL THEN
    RAISE LOG '❌ No se encontró registro de cálculo para conductor % en período %',
      target_driver_user_id, target_company_payment_period_id;
    RETURN;
  END IF;

  -- Obtener la configuración de porcentajes de la empresa
  SELECT 
    c.default_dispatching_percentage,
    c.default_factoring_percentage, 
    c.default_leasing_percentage
  INTO company_settings
  FROM company_payment_periods cpp
  JOIN companies c ON cpp.company_id = c.id
  WHERE cpp.id = target_company_payment_period_id;

  -- Obtener los IDs de los tipos de deducciones por porcentajes
  SELECT id INTO dispatching_expense_type_id FROM expense_types WHERE name = 'Dispatching Fee' LIMIT 1;
  SELECT id INTO factoring_expense_type_id FROM expense_types WHERE name = 'Factoring Fee' LIMIT 1;
  SELECT id INTO leasing_expense_type_id FROM expense_types WHERE name = 'Leasing Fee' LIMIT 1;

  -- ===============================================
  -- PASO 1: LIMPIAR DEDUCCIONES AUTOMÁTICAS EXISTENTES
  -- ===============================================
  
  DELETE FROM expense_instances 
  WHERE payment_period_id = calculation_record.id
    AND user_id = target_driver_user_id
    AND expense_type_id IN (dispatching_expense_type_id, factoring_expense_type_id, leasing_expense_type_id);

  RAISE LOG '✅ Limpiadas deducciones automáticas previas para conductor %', target_driver_user_id;

  -- ===============================================
  -- PASO 2: GENERAR DEDUCCIONES POR CADA CARGA
  -- ===============================================
  
  FOR load_record IN 
    SELECT l.*
    FROM loads l
    WHERE l.driver_user_id = target_driver_user_id
      AND l.payment_period_id = target_company_payment_period_id
      AND l.status NOT IN ('cancelled', 'rejected')
      AND l.total_amount > 0
  LOOP
    -- Calcular los montos de deducción por porcentajes
    dispatching_amount := ROUND(load_record.total_amount * (COALESCE(company_settings.default_dispatching_percentage, 5) / 100.0), 2);
    factoring_amount := ROUND(load_record.total_amount * (COALESCE(company_settings.default_factoring_percentage, 3) / 100.0), 2);  
    leasing_amount := ROUND(load_record.total_amount * (COALESCE(company_settings.default_leasing_percentage, 5) / 100.0), 2);

    -- Insertar deducción por dispatching (5%)
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

    -- Insertar deducción por factoring (3%)
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

    -- Insertar deducción por leasing (5%)
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
    
    RAISE LOG '✅ Carga #% ($%): Dispatching=$%, Factoring=$%, Leasing=$%',
      load_record.load_number, load_record.total_amount, dispatching_amount, factoring_amount, leasing_amount;
  END LOOP;

  -- ===============================================
  -- PASO 3: RECALCULAR TODOS LOS TOTALES
  -- ===============================================
  
  UPDATE driver_period_calculations 
  SET 
    -- Suma de todas las cargas válidas
    gross_earnings = (
      SELECT COALESCE(SUM(l.total_amount), 0)
      FROM loads l
      WHERE l.driver_user_id = target_driver_user_id
        AND l.payment_period_id = target_company_payment_period_id
        AND l.status NOT IN ('cancelled', 'rejected')
    ),
    -- Suma de otros ingresos adicionales
    other_income = (
      SELECT COALESCE(SUM(oi.amount), 0)
      FROM other_income oi
      WHERE oi.user_id = target_driver_user_id
        AND oi.payment_period_id = calculation_record.id
    ),
    -- Suma de gastos de combustible
    fuel_expenses = (
      SELECT COALESCE(SUM(fe.total_amount), 0)
      FROM fuel_expenses fe
      WHERE fe.driver_user_id = target_driver_user_id
        AND fe.payment_period_id = calculation_record.id
    ),
    -- Suma de TODAS las deducciones (automáticas + manuales)
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

  -- Calcular los totales finales
  UPDATE driver_period_calculations 
  SET 
    total_income = gross_earnings + other_income,
    net_payment = (gross_earnings + other_income) - fuel_expenses - total_deductions,
    has_negative_balance = ((gross_earnings + other_income) - fuel_expenses - total_deductions) < 0,
    updated_at = now()
  WHERE driver_user_id = target_driver_user_id
    AND company_payment_period_id = target_company_payment_period_id;

  RAISE LOG '✅ RECÁLCULO ROBUSTO COMPLETADO: Conductor=%, Deducciones automáticas=$ %',
    target_driver_user_id, ROUND(total_load_deductions, 2);

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '❌ ERROR en recálculo robusto: % - Conductor: %, Período: %', 
    SQLERRM, target_driver_user_id, target_company_payment_period_id;
  RAISE;
END;
$$;

-- ===============================================
-- 3. FUNCIONES DE TRIGGERS OPTIMIZADAS
-- ===============================================

-- Trigger para cargas
CREATE OR REPLACE FUNCTION trigger_auto_recalculate_on_loads()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.driver_user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL THEN
    PERFORM auto_recalculate_driver_payment_period_v2(NEW.driver_user_id, NEW.payment_period_id);
  ELSIF TG_OP = 'DELETE' AND OLD.driver_user_id IS NOT NULL AND OLD.payment_period_id IS NOT NULL THEN
    PERFORM auto_recalculate_driver_payment_period_v2(OLD.driver_user_id, OLD.payment_period_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

-- Trigger para combustible
CREATE OR REPLACE FUNCTION trigger_auto_recalculate_on_fuel()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  company_payment_period_id UUID;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.driver_user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL THEN
    SELECT dpc.company_payment_period_id INTO company_payment_period_id
    FROM driver_period_calculations dpc WHERE dpc.id = NEW.payment_period_id;
    IF company_payment_period_id IS NOT NULL THEN
      PERFORM auto_recalculate_driver_payment_period_v2(NEW.driver_user_id, company_payment_period_id);
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.driver_user_id IS NOT NULL AND OLD.payment_period_id IS NOT NULL THEN
    SELECT dpc.company_payment_period_id INTO company_payment_period_id
    FROM driver_period_calculations dpc WHERE dpc.id = OLD.payment_period_id;
    IF company_payment_period_id IS NOT NULL THEN
      PERFORM auto_recalculate_driver_payment_period_v2(OLD.driver_user_id, company_payment_period_id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

-- Trigger para deducciones (evita bucles infinitos)
CREATE OR REPLACE FUNCTION trigger_auto_recalculate_on_expenses()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  company_payment_period_id UUID;
  is_auto_deduction BOOLEAN := FALSE;
BEGIN
  -- Verificar si es una deducción automática por porcentajes
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    SELECT CASE WHEN NEW.expense_type_id IN (
      SELECT id FROM expense_types WHERE name IN ('Dispatching Fee', 'Factoring Fee', 'Leasing Fee')
    ) THEN TRUE ELSE FALSE END INTO is_auto_deduction;
  ELSIF TG_OP = 'DELETE' THEN
    SELECT CASE WHEN OLD.expense_type_id IN (
      SELECT id FROM expense_types WHERE name IN ('Dispatching Fee', 'Factoring Fee', 'Leasing Fee')
    ) THEN TRUE ELSE FALSE END INTO is_auto_deduction;
  END IF;
  
  -- Solo recalcular para deducciones manuales (no automáticas)
  IF NOT COALESCE(is_auto_deduction, FALSE) THEN
    IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL THEN
      SELECT dpc.company_payment_period_id INTO company_payment_period_id
      FROM driver_period_calculations dpc WHERE dpc.id = NEW.payment_period_id;
      IF company_payment_period_id IS NOT NULL THEN
        PERFORM auto_recalculate_driver_payment_period_v2(NEW.user_id, company_payment_period_id);
      END IF;
    ELSIF TG_OP = 'DELETE' AND OLD.user_id IS NOT NULL AND OLD.payment_period_id IS NOT NULL THEN
      SELECT dpc.company_payment_period_id INTO company_payment_period_id
      FROM driver_period_calculations dpc WHERE dpc.id = OLD.payment_period_id;
      IF company_payment_period_id IS NOT NULL THEN
        PERFORM auto_recalculate_driver_payment_period_v2(OLD.user_id, company_payment_period_id);
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

-- Trigger para otros ingresos
CREATE OR REPLACE FUNCTION trigger_auto_recalculate_on_income()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  company_payment_period_id UUID;
BEGIN
  IF TG_OP IN ('INSERT', 'UPDATE') AND NEW.user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL THEN
    SELECT dpc.company_payment_period_id INTO company_payment_period_id
    FROM driver_period_calculations dpc WHERE dpc.id = NEW.payment_period_id;
    IF company_payment_period_id IS NOT NULL THEN
      PERFORM auto_recalculate_driver_payment_period_v2(NEW.user_id, company_payment_period_id);
    END IF;
  ELSIF TG_OP = 'DELETE' AND OLD.user_id IS NOT NULL AND OLD.payment_period_id IS NOT NULL THEN
    SELECT dpc.company_payment_period_id INTO company_payment_period_id
    FROM driver_period_calculations dpc WHERE dpc.id = OLD.payment_period_id;
    IF company_payment_period_id IS NOT NULL THEN
      PERFORM auto_recalculate_driver_payment_period_v2(OLD.user_id, company_payment_period_id);
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END; $$;

-- ===============================================
-- 4. INSTALAR TODOS LOS TRIGGERS
-- ===============================================

-- Limpiar triggers anteriores
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

-- Crear triggers nuevos
CREATE TRIGGER trigger_auto_recalc_loads_insert AFTER INSERT ON loads FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_loads();
CREATE TRIGGER trigger_auto_recalc_loads_update AFTER UPDATE ON loads FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_loads();
CREATE TRIGGER trigger_auto_recalc_loads_delete AFTER DELETE ON loads FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_loads();

CREATE TRIGGER trigger_auto_recalc_fuel_insert AFTER INSERT ON fuel_expenses FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_fuel();
CREATE TRIGGER trigger_auto_recalc_fuel_update AFTER UPDATE ON fuel_expenses FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_fuel();
CREATE TRIGGER trigger_auto_recalc_fuel_delete AFTER DELETE ON fuel_expenses FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_fuel();

CREATE TRIGGER trigger_auto_recalc_expenses_insert AFTER INSERT ON expense_instances FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_expenses();
CREATE TRIGGER trigger_auto_recalc_expenses_update AFTER UPDATE ON expense_instances FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_expenses();
CREATE TRIGGER trigger_auto_recalc_expenses_delete AFTER DELETE ON expense_instances FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_expenses();

CREATE TRIGGER trigger_auto_recalc_income_insert AFTER INSERT ON other_income FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_income();
CREATE TRIGGER trigger_auto_recalc_income_update AFTER UPDATE ON other_income FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_income();
CREATE TRIGGER trigger_auto_recalc_income_delete AFTER DELETE ON other_income FOR EACH ROW EXECUTE FUNCTION trigger_auto_recalculate_on_income();

-- ===============================================
-- 5. PROBAR EL SISTEMA COMPLETO
-- ===============================================

-- Ejecutar recálculo para verificar funcionamiento
SELECT auto_recalculate_driver_payment_period_v2(
  '484d83b3-b928-46b3-9705-db225ddb9b0c'::UUID,
  '49cb0343-7af4-4df0-b31e-75380709c58e'::UUID
);

-- Mostrar resultados del cálculo robusto
SELECT 
    '🚀 SISTEMA ROBUSTO DE CÁLCULOS IMPLEMENTADO' as "ESTADO",
    ROUND(dpc.gross_earnings, 2) as "INGRESOS BRUTOS",
    ROUND(dpc.total_deductions, 2) as "TOTAL DEDUCCIONES", 
    ROUND(dpc.fuel_expenses, 2) as "COMBUSTIBLE",
    ROUND(dpc.other_income, 2) as "OTROS INGRESOS",
    ROUND(dpc.net_payment, 2) as "PAGO NETO",
    CASE WHEN dpc.has_negative_balance THEN 'SÍ ⚠️' ELSE 'NO ✅' END as "BALANCE NEGATIVO"
FROM driver_period_calculations dpc 
WHERE dpc.driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
AND dpc.company_payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e';

-- Mostrar deducciones automáticas generadas por cargas
SELECT 
    '🔧 DEDUCCIONES AUTOMÁTICAS POR CARGAS' as "TIPO",
    et.name as "DEDUCCIÓN",
    ROUND(ei.amount, 2) as "MONTO",
    SUBSTRING(ei.description, 1, 50) || '...' as "DESCRIPCIÓN"
FROM expense_instances ei
JOIN expense_types et ON ei.expense_type_id = et.id
WHERE ei.user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
  AND ei.payment_period_id = (
    SELECT id FROM driver_period_calculations 
    WHERE driver_user_id = '484d83b3-b928-46b3-9705-db225ddb9b0c'
    AND company_payment_period_id = '49cb0343-7af4-4df0-b31e-75380709c58e'
  )
  AND et.name IN ('Dispatching Fee', 'Factoring Fee', 'Leasing Fee')
ORDER BY et.name;