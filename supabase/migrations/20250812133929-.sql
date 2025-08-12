-- Crear el esquema 'views' para organizar vistas separadas de las tablas
CREATE SCHEMA IF NOT EXISTS views;

-- Crear vista ordenada lógicamente de driver_profiles
-- La seguridad se hereda de la tabla base driver_profiles
CREATE VIEW views.profiles_ordered AS
SELECT 
  -- 1. IDENTIFICADORES
  id,
  user_id,
  driver_id,
  
  -- 2. INFORMACIÓN DE LICENCIA/CDL
  license_number,
  license_state,
  license_issue_date,
  license_expiry_date,
  cdl_class,
  cdl_endorsements,
  
  -- 3. CONTACTOS DE EMERGENCIA
  emergency_contact_name,
  emergency_contact_phone,
  
  -- 4. ESTADO Y METADATOS
  is_active,
  created_at,
  updated_at
  
FROM driver_profiles
ORDER BY created_at DESC;

-- Comentario explicativo
COMMENT ON VIEW views.profiles_ordered IS 'Vista ordenada lógicamente de driver_profiles: identificadores, info licencia, contactos emergencia, metadatos sistema. La seguridad se hereda de la tabla base.';