-- Eliminar hire_date redundante de driver_profiles
ALTER TABLE public.driver_profiles 
DROP COLUMN IF EXISTS hire_date;

-- Eliminar hire_date redundante de user_company_roles  
ALTER TABLE public.user_company_roles 
DROP COLUMN IF EXISTS hire_date;

-- Agregar comentarios para documentar que hire_date ahora está en profiles
COMMENT ON TABLE public.profiles IS 'Perfiles de usuario con información básica incluyendo fecha de contratación';
COMMENT ON TABLE public.driver_profiles IS 'Información específica de conductores (CDL, licencias, etc.)';
COMMENT ON TABLE public.user_company_roles IS 'Roles de usuario en compañías (sin fecha de contratación, que está en profiles)';