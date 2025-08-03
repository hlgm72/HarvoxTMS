-- Agregar hire_date a la tabla profiles
ALTER TABLE public.profiles 
ADD COLUMN hire_date DATE;

-- Migrar datos existentes de driver_profiles.hire_date a profiles.hire_date
UPDATE public.profiles 
SET hire_date = dp.hire_date
FROM public.driver_profiles dp
WHERE profiles.user_id = dp.user_id 
AND dp.hire_date IS NOT NULL;

-- Agregar comentario para documentar el campo
COMMENT ON COLUMN public.profiles.hire_date IS 'Fecha de contratación del empleado en la compañía';