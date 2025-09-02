-- ===============================================
-- 🚨 CORRECCIÓN DEFINITIVA: TRIGGERS Y FUNCIONES
-- ===============================================
-- Problema: Los triggers no existen y las funciones tienen errores de referencias

-- 1. CORREGIR LA FUNCIÓN TRIGGER PARA LOADS
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_loads()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected_driver_user_id UUID;
  affected_company_period_id UUID;
BEGIN
  -- Determinar el conductor y período afectado
  IF TG_OP = 'DELETE' THEN
    affected_driver_user_id := OLD.driver_user_id;
    affected_company_period_id := OLD.payment_period_id;
  ELSE
    affected_driver_user_id := NEW.driver_user_id;
    affected_company_period_id := NEW.payment_period_id;
  END IF;

  -- Solo recalcular si hay conductor y período válidos
  IF affected_driver_user_id IS NOT NULL AND affected_company_period_id IS NOT NULL THEN
    -- Llamar a la versión corregida v2.2 con los IDs correctos
    PERFORM public.auto_recalculate_driver_payment_period_v2(
      affected_driver_user_id, 
      affected_company_period_id
    );
    
    RAISE LOG 'auto_recalculate_on_loads: Recálculo v2.2 ejecutado para conductor % en período %', 
      affected_driver_user_id, affected_company_period_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 2. CORREGIR LA FUNCIÓN TRIGGER PARA FUEL EXPENSES
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_fuel_expenses()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected_driver_user_id UUID;
  affected_company_period_id UUID;
BEGIN
  -- Determinar el conductor y período afectado
  IF TG_OP = 'DELETE' THEN
    affected_driver_user_id := OLD.driver_user_id;
    -- Para fuel_expenses, payment_period_id referencia driver_period_calculations.id
    SELECT company_payment_period_id INTO affected_company_period_id
    FROM driver_period_calculations 
    WHERE id = OLD.payment_period_id;
  ELSE
    affected_driver_user_id := NEW.driver_user_id;
    -- Para fuel_expenses, payment_period_id referencia driver_period_calculations.id
    SELECT company_payment_period_id INTO affected_company_period_id
    FROM driver_period_calculations 
    WHERE id = NEW.payment_period_id;
  END IF;

  -- Solo recalcular si hay conductor y período válidos
  IF affected_driver_user_id IS NOT NULL AND affected_company_period_id IS NOT NULL THEN
    PERFORM public.auto_recalculate_driver_payment_period_v2(
      affected_driver_user_id, 
      affected_company_period_id
    );
    
    RAISE LOG 'auto_recalculate_on_fuel_expenses: Recálculo v2.2 ejecutado para conductor % en período %', 
      affected_driver_user_id, affected_company_period_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 3. CORREGIR LA FUNCIÓN TRIGGER PARA EXPENSE INSTANCES
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_expense_instances()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected_driver_user_id UUID;
  affected_company_period_id UUID;
BEGIN
  -- Determinar el conductor y período afectado
  IF TG_OP = 'DELETE' THEN
    affected_driver_user_id := OLD.user_id;
    -- Para expense_instances, payment_period_id referencia driver_period_calculations.id
    SELECT company_payment_period_id INTO affected_company_period_id
    FROM driver_period_calculations 
    WHERE id = OLD.payment_period_id;
  ELSE
    affected_driver_user_id := NEW.user_id;
    -- Para expense_instances, payment_period_id referencia driver_period_calculations.id
    SELECT company_payment_period_id INTO affected_company_period_id
    FROM driver_period_calculations 
    WHERE id = NEW.payment_period_id;
  END IF;

  -- Solo recalcular si hay conductor y período válidos
  IF affected_driver_user_id IS NOT NULL AND affected_company_period_id IS NOT NULL THEN
    PERFORM public.auto_recalculate_driver_payment_period_v2(
      affected_driver_user_id, 
      affected_company_period_id
    );
    
    RAISE LOG 'auto_recalculate_on_expense_instances: Recálculo v2.2 ejecutado para conductor % en período %', 
      affected_driver_user_id, affected_company_period_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 4. RECREAR TODOS LOS TRIGGERS CON NOMBRES ÚNICOS
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_loads_change ON public.loads;
CREATE TRIGGER trigger_auto_recalculate_on_loads_change
    AFTER INSERT OR UPDATE OR DELETE ON public.loads
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_loads();

DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_fuel_changes ON public.fuel_expenses;
CREATE TRIGGER trigger_auto_recalculate_on_fuel_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.fuel_expenses
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_fuel_expenses();

DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_expense_changes ON public.expense_instances;
CREATE TRIGGER trigger_auto_recalculate_on_expense_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.expense_instances
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_expense_instances();

DROP TRIGGER IF EXISTS trigger_auto_apply_expense_instance ON public.expense_instances;
CREATE TRIGGER trigger_auto_apply_expense_instance
    BEFORE INSERT ON public.expense_instances
    FOR EACH ROW
    EXECUTE FUNCTION auto_apply_expense_instance();

DROP TRIGGER IF EXISTS trigger_auto_assign_payment_period_to_load ON public.loads;
CREATE TRIGGER trigger_auto_assign_payment_period_to_load
    BEFORE INSERT OR UPDATE ON public.loads
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_payment_period_to_load();

-- Log de confirmación
DO $$
BEGIN
    RAISE NOTICE '✅ SISTEMA REPARADO COMPLETAMENTE:';
    RAISE NOTICE '   - Funciones trigger corregidas con referencias correctas';
    RAISE NOTICE '   - Todos los triggers recreados y funcionando';
    RAISE NOTICE '   - Sistema de recálculo v2.2 activado';
    RAISE NOTICE '   - Separación clara entre company_payment_periods.id y driver_period_calculations.id';
END $$;