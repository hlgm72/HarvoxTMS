-- Función para validar si un número de carga ya existe en la compañía
CREATE OR REPLACE FUNCTION public.check_load_number_exists(
  load_number_param TEXT,
  exclude_load_id_param UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_company_id UUID;
  load_exists BOOLEAN := false;
BEGIN
  -- Obtener la compañía del usuario actual
  SELECT company_id INTO user_company_id
  FROM user_company_roles
  WHERE user_id = auth.uid()
    AND is_active = true
  LIMIT 1;

  IF user_company_id IS NULL THEN
    RETURN false;
  END IF;

  -- Verificar si existe una carga con ese número en cargas con conductores de la compañía
  -- o creadas por usuarios de la compañía
  SELECT EXISTS (
    SELECT 1
    FROM loads l
    WHERE l.load_number = load_number_param
      AND (
        -- Cargas con conductor de la compañía
        l.driver_user_id IN (
          SELECT user_id FROM user_company_roles 
          WHERE company_id = user_company_id AND is_active = true
        )
        OR
        -- Cargas creadas por usuarios de la compañía (sin conductor asignado aún)
        l.created_by IN (
          SELECT user_id FROM user_company_roles 
          WHERE company_id = user_company_id AND is_active = true
        )
      )
      AND (exclude_load_id_param IS NULL OR l.id != exclude_load_id_param)
    LIMIT 1
  ) INTO load_exists;

  RETURN load_exists;
END;
$$;