-- Agregar campo date_of_birth a la tabla profiles
ALTER TABLE public.profiles 
ADD COLUMN date_of_birth DATE;

-- Migrar datos existentes de driver_profiles a profiles
UPDATE public.profiles 
SET date_of_birth = dp.date_of_birth
FROM public.driver_profiles dp
WHERE profiles.user_id = dp.user_id 
AND dp.date_of_birth IS NOT NULL;

-- Eliminar el campo date_of_birth de driver_profiles
ALTER TABLE public.driver_profiles 
DROP COLUMN date_of_birth;