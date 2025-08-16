-- Añadir campos ETA y notas para paradas de conductores
-- Esto permite que los conductores proporcionen tiempo estimado de llegada y notas adicionales

ALTER TABLE public.load_stops 
ADD COLUMN IF NOT EXISTS estimated_arrival_time TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS driver_notes TEXT,
ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS status_updated_by UUID;

-- Comentarios para documentar los nuevos campos
COMMENT ON COLUMN public.load_stops.estimated_arrival_time IS 'ETA proporcionado por el conductor al actualizar estado';
COMMENT ON COLUMN public.load_stops.driver_notes IS 'Notas del conductor sobre la parada';
COMMENT ON COLUMN public.load_stops.status_updated_at IS 'Timestamp de última actualización de estado por conductor';
COMMENT ON COLUMN public.load_stops.status_updated_by IS 'Usuario que actualizó el estado de la parada';