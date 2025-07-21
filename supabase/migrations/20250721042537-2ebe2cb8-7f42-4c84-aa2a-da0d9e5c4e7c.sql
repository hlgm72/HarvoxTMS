-- Arreglar el problema de seguridad del search_path en la función
-- Eliminar la función actual y recrearla con search_path seguro

DROP FUNCTION IF EXISTS public.update_load_dates_clean() CASCADE;

-- Recrear la función con search_path seguro
CREATE OR REPLACE FUNCTION public.update_load_dates_clean()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'pg_temp'
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

-- Recrear el trigger
CREATE TRIGGER update_load_dates_clean_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.load_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_load_dates_clean();