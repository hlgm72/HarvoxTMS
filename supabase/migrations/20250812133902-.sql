-- Crear el esquema 'views' para organizar vistas separadas de las tablas
CREATE SCHEMA IF NOT EXISTS views;

-- Crear vista ordenada lógicamente de driver_profiles
-- Usando solo los campos que existen en la tabla
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

-- Aplicar RLS a la vista
ALTER VIEW views.profiles_ordered ENABLE ROW LEVEL SECURITY;

-- Crear política para que los usuarios puedan ver según las mismas reglas que driver_profiles
CREATE POLICY "Profiles ordered view access" ON views.profiles_ordered
FOR SELECT USING (
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND 
  (
    auth.uid() = user_id OR 
    user_id IN (
      SELECT ucr1.user_id
      FROM user_company_roles ucr1
      WHERE ucr1.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() 
        AND ucr2.is_active = true 
        AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role])
      ) 
      AND ucr1.is_active = true
    )
  )
);

-- Comentario explicativo
COMMENT ON VIEW views.profiles_ordered IS 'Vista ordenada lógicamente de driver_profiles: identificadores, info licencia, contactos emergencia, metadatos sistema';