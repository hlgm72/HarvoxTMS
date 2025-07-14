-- Agregar campo de teléfono principal a la tabla company_brokers
ALTER TABLE public.company_brokers 
ADD COLUMN phone TEXT;

-- Agregar comentario para claridad
COMMENT ON COLUMN public.company_brokers.phone IS 'Main phone number for the broker/client';