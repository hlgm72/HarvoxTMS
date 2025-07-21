-- Temporalmente desactivar el trigger problemático que causa la ambigüedad de company_id
DROP TRIGGER IF EXISTS assign_payment_period_after_stops_trigger ON public.load_stops;

-- Crear una función más simple sin ambigüedad
CREATE OR REPLACE FUNCTION public.simple_update_load_dates_from_stops()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pickup_date_calc DATE;
  delivery_date_calc DATE;
BEGIN
  -- Obtener fecha de pickup (primera parada de pickup)
  SELECT scheduled_date INTO pickup_date_calc
  FROM public.load_stops 
  WHERE load_id = COALESCE(NEW.load_id, OLD.load_id) 
  AND stop_type = 'pickup'
  ORDER BY stop_number ASC
  LIMIT 1;
  
  -- Obtener fecha de delivery (última parada de delivery)
  SELECT scheduled_date INTO delivery_date_calc
  FROM public.load_stops 
  WHERE load_id = COALESCE(NEW.load_id, OLD.load_id) 
  AND stop_type = 'delivery'
  ORDER BY stop_number DESC
  LIMIT 1;
  
  -- Actualizar la carga con las fechas calculadas
  UPDATE public.loads 
  SET 
    pickup_date = pickup_date_calc,
    delivery_date = delivery_date_calc,
    updated_at = now()
  WHERE id = COALESCE(NEW.load_id, OLD.load_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Crear el trigger simplificado
CREATE TRIGGER simple_update_dates_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.load_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.simple_update_load_dates_from_stops();