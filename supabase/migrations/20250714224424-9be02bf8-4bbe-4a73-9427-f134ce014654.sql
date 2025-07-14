-- Eliminar campos redundantes de fechas en tabla loads
-- Las fechas reales están en load_stops, y la asignación de período es por payment_period_id

ALTER TABLE public.loads 
DROP COLUMN IF EXISTS pickup_date,
DROP COLUMN IF EXISTS delivery_date;

-- Agregar comentario para documentar la decisión
COMMENT ON TABLE public.loads IS 'Tabla de cargas. Las fechas están en load_stops, el período se asigna por payment_period_id';
COMMENT ON COLUMN public.loads.payment_period_id IS 'FK al período de pago asignado. Determina a qué período pertenece la carga independientemente de fechas';