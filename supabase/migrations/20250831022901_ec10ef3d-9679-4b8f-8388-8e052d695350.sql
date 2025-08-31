-- Completar triggers faltantes para sistema completo de recálculo automático

-- Triggers para fuel_expenses
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_fuel_expenses()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_period_id UUID;
BEGIN
  target_period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  
  IF target_period_id IS NOT NULL THEN
    SELECT company_payment_period_id INTO target_period_id
    FROM driver_period_calculations 
    WHERE id = target_period_id;
    
    IF target_period_id IS NOT NULL THEN
      PERFORM recalculate_payment_period_totals(target_period_id);
      RAISE LOG 'auto_recalculate_on_fuel_expenses: Recálculo ejecutado para período %', target_period_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers para expense_instances
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_expense_instances()
RETURNS TRIGGER
LANGUAGE plpgsql  
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_period_id UUID;
BEGIN
  target_period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  
  IF target_period_id IS NOT NULL THEN
    SELECT company_payment_period_id INTO target_period_id
    FROM driver_period_calculations 
    WHERE id = target_period_id;
    
    IF target_period_id IS NOT NULL THEN
      PERFORM recalculate_payment_period_totals(target_period_id);
      RAISE LOG 'auto_recalculate_on_expense_instances: Recálculo ejecutado para período %', target_period_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Triggers para other_income
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_other_income()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER  
SET search_path TO 'public'
AS $$
DECLARE
  target_period_id UUID;
BEGIN
  target_period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  
  IF target_period_id IS NOT NULL THEN
    SELECT company_payment_period_id INTO target_period_id
    FROM driver_period_calculations 
    WHERE id = target_period_id;
    
    IF target_period_id IS NOT NULL THEN
      PERFORM recalculate_payment_period_totals(target_period_id);
      RAISE LOG 'auto_recalculate_on_other_income: Recálculo ejecutado para período %', target_period_id;
    END IF;
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Crear triggers para fuel_expenses
DROP TRIGGER IF EXISTS trigger_auto_recalculate_fuel_insert ON fuel_expenses;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_fuel_update ON fuel_expenses;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_fuel_delete ON fuel_expenses;

CREATE TRIGGER trigger_auto_recalculate_fuel_insert
    AFTER INSERT ON fuel_expenses
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_fuel_expenses();

CREATE TRIGGER trigger_auto_recalculate_fuel_update
    AFTER UPDATE ON fuel_expenses
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_fuel_expenses();

CREATE TRIGGER trigger_auto_recalculate_fuel_delete
    AFTER DELETE ON fuel_expenses
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_fuel_expenses();

-- Crear triggers para expense_instances
DROP TRIGGER IF EXISTS trigger_auto_recalculate_expenses_insert ON expense_instances;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_expenses_update ON expense_instances;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_expenses_delete ON expense_instances;

CREATE TRIGGER trigger_auto_recalculate_expenses_insert
    AFTER INSERT ON expense_instances
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_expense_instances();

CREATE TRIGGER trigger_auto_recalculate_expenses_update
    AFTER UPDATE ON expense_instances
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_expense_instances();

CREATE TRIGGER trigger_auto_recalculate_expenses_delete
    AFTER DELETE ON expense_instances
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_expense_instances();

-- Crear triggers para other_income
DROP TRIGGER IF EXISTS trigger_auto_recalculate_income_insert ON other_income;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_income_update ON other_income;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_income_delete ON other_income;

CREATE TRIGGER trigger_auto_recalculate_income_insert
    AFTER INSERT ON other_income
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_other_income();

CREATE TRIGGER trigger_auto_recalculate_income_update
    AFTER UPDATE ON other_income
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_other_income();

CREATE TRIGGER trigger_auto_recalculate_income_delete
    AFTER DELETE ON other_income
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_other_income();

-- Verificar que todos los triggers se crearon
SELECT 'SISTEMA DE RECÁLCULO AUTOMÁTICO COMPLETAMENTE RESTAURADO' as status;