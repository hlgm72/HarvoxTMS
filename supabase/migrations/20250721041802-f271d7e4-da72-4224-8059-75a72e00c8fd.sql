-- Verificar y eliminar TODOS los triggers problemáticos en load_stops
DROP TRIGGER IF EXISTS simple_update_dates_trigger ON public.load_stops;
DROP TRIGGER IF EXISTS assign_payment_period_after_stops_trigger ON public.load_stops;
DROP TRIGGER IF EXISTS update_load_dates_from_stops_trigger ON public.load_stops;
DROP TRIGGER IF EXISTS handle_load_stops_changes_trigger ON public.load_stops;

-- Verificar qué funciones existen que puedan tener ambigüedad de company_id
-- Eliminar función problemática si existe
DROP FUNCTION IF EXISTS public.assign_payment_period_to_load_by_id(uuid);
DROP FUNCTION IF EXISTS public.handle_load_stops_changes();
DROP FUNCTION IF EXISTS public.update_load_dates_from_stops();

-- Crear una función completamente limpia para actualizar fechas
CREATE OR REPLACE FUNCTION public.update_load_dates_simple()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pickup_date_calc DATE;
  delivery_date_calc DATE;
  target_load_id UUID;
BEGIN
  -- Obtener el load_id de manera segura
  target_load_id := COALESCE(NEW.load_id, OLD.load_id);
  
  -- Obtener fecha de pickup (primera parada de pickup)
  SELECT scheduled_date INTO pickup_date_calc
  FROM public.load_stops 
  WHERE load_id = target_load_id 
  AND stop_type = 'pickup'
  ORDER BY stop_number ASC
  LIMIT 1;
  
  -- Obtener fecha de delivery (última parada de delivery)
  SELECT scheduled_date INTO delivery_date_calc
  FROM public.load_stops 
  WHERE load_id = target_load_id 
  AND stop_type = 'delivery'
  ORDER BY stop_number DESC
  LIMIT 1;
  
  -- Actualizar solo las fechas en la carga
  UPDATE public.loads 
  SET 
    pickup_date = pickup_date_calc,
    delivery_date = delivery_date_calc,
    updated_at = now()
  WHERE id = target_load_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Crear el trigger limpio
CREATE TRIGGER update_load_dates_simple_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.load_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_load_dates_simple();