-- Agregar campos de dirección a la tabla profiles
ALTER TABLE public.profiles 
ADD COLUMN street_address TEXT,
ADD COLUMN state_id TEXT,
ADD COLUMN city_id UUID,
ADD COLUMN zip_code VARCHAR(5);

-- Agregar comentarios para documentar los campos
COMMENT ON COLUMN public.profiles.street_address IS 'Dirección de la calle del usuario';
COMMENT ON COLUMN public.profiles.state_id IS 'ID del estado, referencia a la tabla states';
COMMENT ON COLUMN public.profiles.city_id IS 'ID de la ciudad, referencia a la tabla cities';
COMMENT ON COLUMN public.profiles.zip_code IS 'Código postal (hasta 5 dígitos)';