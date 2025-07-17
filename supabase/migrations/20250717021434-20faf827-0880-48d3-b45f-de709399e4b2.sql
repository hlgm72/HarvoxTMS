-- Agregar campo para dispatcher interno en la tabla loads
ALTER TABLE public.loads 
ADD COLUMN internal_dispatcher_id uuid REFERENCES auth.users(id);

-- Agregar comentario para documentar el campo
COMMENT ON COLUMN public.loads.internal_dispatcher_id IS 'Usuario interno de la compañía con rol dispatcher que maneja esta carga (opcional)';