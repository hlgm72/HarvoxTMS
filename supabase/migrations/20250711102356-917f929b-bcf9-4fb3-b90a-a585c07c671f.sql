-- Corregir los datos incorrectos en la tabla profiles
-- El problema es que el last_name contiene un email en lugar del apellido

UPDATE public.profiles 
SET 
  first_name = 'Hector',
  last_name = 'Gonzalez',
  updated_at = now()
WHERE user_id = '087a825c-94ea-42d9-8388-5087a19d776f' 
  AND first_name = 'Hector Gonzalez' 
  AND last_name = 'hlgm72@gmail.com';