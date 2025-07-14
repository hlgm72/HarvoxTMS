-- Primero eliminar la vista que depende de estos campos
DROP VIEW IF EXISTS public.loads_with_calculated_dates CASCADE;

-- Luego eliminar los campos redundantes
ALTER TABLE public.loads 
DROP COLUMN IF EXISTS pickup_date,
DROP COLUMN IF EXISTS delivery_date;

-- Crear una nueva vista que obtenga fechas desde load_stops
CREATE OR REPLACE VIEW public.loads_with_calculated_dates AS
SELECT 
  l.*,
  -- Obtener primera fecha de pickup
  pickup_stops.scheduled_date as calculated_pickup_date,
  pickup_stops.actual_date as actual_pickup_date,
  -- Obtener última fecha de delivery  
  delivery_stops.scheduled_date as calculated_delivery_date,
  delivery_stops.actual_date as actual_delivery_date
FROM public.loads l
LEFT JOIN (
  SELECT DISTINCT ON (load_id) 
    load_id, scheduled_date, actual_date
  FROM public.load_stops 
  WHERE stop_type = 'pickup'
  ORDER BY load_id, stop_number ASC
) pickup_stops ON l.id = pickup_stops.load_id
LEFT JOIN (
  SELECT DISTINCT ON (load_id) 
    load_id, scheduled_date, actual_date
  FROM public.load_stops 
  WHERE stop_type = 'delivery'
  ORDER BY load_id, stop_number DESC
) delivery_stops ON l.id = delivery_stops.load_id;

-- Documentar la decisión
COMMENT ON TABLE public.loads IS 'Tabla de cargas. Las fechas están en load_stops, el período se asigna por payment_period_id';
COMMENT ON COLUMN public.loads.payment_period_id IS 'FK al período de pago asignado. Determina a qué período pertenece la carga independientemente de fechas';
COMMENT ON VIEW public.loads_with_calculated_dates IS 'Vista que calcula fechas de pickup/delivery desde load_stops para mantener compatibilidad';