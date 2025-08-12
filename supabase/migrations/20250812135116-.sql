-- Eliminar la vista anterior incorrecta
DROP VIEW IF EXISTS views.profiles_ordered;

-- Crear vista ordenada lógicamente de la tabla profiles
-- La seguridad se hereda de la tabla base profiles
CREATE VIEW views.profiles AS
SELECT 
  -- 1. IDENTIFICADORES
  user_id,
  
  -- 2. INFORMACIÓN PERSONAL
  first_name,
  last_name,
  phone,
  date_of_birth,
  
  -- 3. INFORMACIÓN DE CONTACTO
  avatar_url,
  
  -- 4. INFORMACIÓN DE DIRECCIÓN
  street_address,
  city,
  state_id,
  zip_code,
  
  -- 5. PREFERENCIAS/CONFIGURACIÓN
  preferred_language,
  timezone,
  
  -- 6. METADATOS DE EMPLEO/SISTEMA
  hire_date,
  created_at,
  updated_at
  
FROM profiles
ORDER BY created_at DESC;

-- Comentario explicativo
COMMENT ON VIEW views.profiles IS 'Vista ordenada lógicamente de profiles: identificadores, info personal, contacto, dirección, preferencias, metadatos. La seguridad se hereda de la tabla base.';