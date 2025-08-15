-- Arreglar funciones con search_path mutable

-- 1. Arreglar enable_service_operation
CREATE OR REPLACE FUNCTION public.enable_service_operation()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT set_config('app.service_operation', 'allowed', true);
$$;

-- 2. Arreglar disable_service_operation  
CREATE OR REPLACE FUNCTION public.disable_service_operation()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT set_config('app.service_operation', 'disabled', true);
$$;

-- 3. Arreglar trigger_recalculate_period_totals
CREATE OR REPLACE FUNCTION trigger_recalculate_period_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Para INSERT y UPDATE, recalcular el período del nuevo registro
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM recalculate_driver_period_totals(NEW.payment_period_id);
    RETURN NEW;
  END IF;
  
  -- Para DELETE, recalcular el período del registro eliminado
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_driver_period_totals(OLD.payment_period_id);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;