-- Crear vista para fechas calculadas de cargas
CREATE OR REPLACE VIEW public.loads_with_calculated_dates AS
SELECT 
  l.*,
  first_stop.scheduled_date as calculated_pickup_date,
  first_stop.actual_date as actual_pickup_date,
  last_stop.scheduled_date as calculated_delivery_date,
  last_stop.actual_date as actual_delivery_date
FROM public.loads l
LEFT JOIN (
  SELECT DISTINCT ON (load_id) 
    load_id, 
    scheduled_date, 
    actual_date
  FROM public.load_stops 
  WHERE stop_type = 'pickup' 
  ORDER BY load_id, stop_number ASC
) first_stop ON l.id = first_stop.load_id
LEFT JOIN (
  SELECT DISTINCT ON (load_id) 
    load_id, 
    scheduled_date, 
    actual_date
  FROM public.load_stops 
  WHERE stop_type = 'delivery' 
  ORDER BY load_id, stop_number DESC
) last_stop ON l.id = last_stop.load_id;

-- Función para actualizar fechas de carga basadas en paradas
CREATE OR REPLACE FUNCTION public.update_load_dates_from_stops()
RETURNS TRIGGER 
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

-- Crear triggers para mantener fechas sincronizadas
DROP TRIGGER IF EXISTS trigger_update_load_dates_on_stop_insert ON public.load_stops;
CREATE TRIGGER trigger_update_load_dates_on_stop_insert
  AFTER INSERT ON public.load_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_load_dates_from_stops();

DROP TRIGGER IF EXISTS trigger_update_load_dates_on_stop_update ON public.load_stops;
CREATE TRIGGER trigger_update_load_dates_on_stop_update
  AFTER UPDATE ON public.load_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_load_dates_from_stops();

DROP TRIGGER IF EXISTS trigger_update_load_dates_on_stop_delete ON public.load_stops;
CREATE TRIGGER trigger_update_load_dates_on_stop_delete
  AFTER DELETE ON public.load_stops
  FOR EACH ROW
  EXECUTE FUNCTION public.update_load_dates_from_stops();