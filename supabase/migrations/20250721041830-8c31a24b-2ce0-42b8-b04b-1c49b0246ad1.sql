-- Eliminar todos los triggers relacionados primero
DROP TRIGGER IF EXISTS trigger_update_load_dates_on_stop_insert ON public.load_stops;
DROP TRIGGER IF EXISTS trigger_update_load_dates_on_stop_update ON public.load_stops;
DROP TRIGGER IF EXISTS trigger_update_load_dates_on_stop_delete ON public.load_stops;
DROP TRIGGER IF EXISTS simple_update_dates_trigger ON public.load_stops;
DROP TRIGGER IF EXISTS assign_payment_period_after_stops_trigger ON public.load_stops;
DROP TRIGGER IF EXISTS update_load_dates_from_stops_trigger ON public.load_stops;
DROP TRIGGER IF EXISTS handle_load_stops_changes_trigger ON public.load_stops;

-- Ahora eliminar las funciones problemáticas
DROP FUNCTION IF EXISTS public.assign_payment_period_to_load_by_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.handle_load_stops_changes() CASCADE;
DROP FUNCTION IF EXISTS public.update_load_dates_from_stops() CASCADE;
DROP FUNCTION IF EXISTS public.simple_update_load_dates_from_stops() CASCADE;

-- Crear función limpia sin ambigüedad
CREATE OR REPLACE FUNCTION public.update_load_dates_clean()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pickup_date_calc DATE;
  delivery_date_calc DATE;
  target_load_id UUID;
BEGIN
  target_load_id := COALESCE(NEW.load_id, OLD.load_id);
  
  -- Obtener fecha de pickup
  SELECT scheduled_date INTO pickup_date_calc
  FROM public.load_stops 
  WHERE load_id = target_load_id 
  AND stop_type = 'pickup'
  ORDER BY stop_number ASC
  LIMIT 1;
  
  -- Obtener fecha de delivery
  SELECT scheduled_date INTO delivery_date_calc
  FROM public.load_stops 
  WHERE load_id = target_load_id 
  AND stop_type = 'delivery'
  ORDER BY stop_number DESC
  LIMIT 1;
  
  -- Actualizar solo las fechas
  UPDATE public.loads 
  SET 
    pickup_date = pickup_date_calc,
    delivery_date = delivery_date_calc,
    updated_at = now()
  WHERE id = target_load_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Crear trigger limpio
CREATE TRIGGER update_load_dates_clean_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.load_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_load_dates_clean();