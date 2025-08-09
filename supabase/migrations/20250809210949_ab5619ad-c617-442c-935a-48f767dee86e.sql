-- Actualizar función para permitir que company_owners eliminen usuarios de su empresa
CREATE OR REPLACE FUNCTION public.permanently_delete_user_with_validation(user_id_param UUID, confirmation_email TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id UUID;
  deletion_check JSONB;
  user_email TEXT;
  target_user_companies UUID[];
  current_user_companies UUID[];
  has_permission BOOLEAN := false;
BEGIN
  -- Verificar usuario autenticado
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- Verificar que el usuario actual es superadmin O company_owner de alguna empresa donde está el usuario objetivo
  
  -- Verificar si es superadmin
  IF EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND role = 'superadmin'
    AND is_active = true
  ) THEN
    has_permission := true;
  ELSE
    -- Verificar si es company_owner de alguna empresa donde está el usuario objetivo
    -- Obtener empresas del usuario objetivo
    SELECT ARRAY(
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = user_id_param
      AND is_active = true
    ) INTO target_user_companies;
    
    -- Verificar si el usuario actual es company_owner en alguna de esas empresas
    IF EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = current_user_id
      AND company_id = ANY(target_user_companies)
      AND role = 'company_owner'
      AND is_active = true
    ) THEN
      has_permission := true;
    END IF;
  END IF;
  
  IF NOT has_permission THEN
    RAISE EXCEPTION 'Solo los superadministradores y propietarios de empresa pueden eliminar usuarios permanentemente';
  END IF;
  
  -- Verificar si el usuario puede ser eliminado
  SELECT can_user_be_permanently_deleted(user_id_param) INTO deletion_check;
  
  IF NOT (deletion_check->>'can_delete')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'El usuario no puede ser eliminado debido a datos relacionados',
      'deletion_check', deletion_check
    );
  END IF;
  
  -- Verificar email de confirmación
  user_email := deletion_check->>'user_email';
  IF user_email != confirmation_email THEN
    RAISE EXCEPTION 'El email de confirmación no coincide con el usuario a eliminar';
  END IF;
  
  -- Prevenir auto-eliminación
  IF user_id_param = current_user_id THEN
    RAISE EXCEPTION 'No puedes eliminar tu propia cuenta';
  END IF;
  
  -- Eliminar registros relacionados en orden correcto para evitar violaciones de FK
  
  -- 1. Eliminar roles de empresa
  DELETE FROM user_company_roles WHERE user_id = user_id_param;
  
  -- 2. Eliminar perfil de conductor si existe
  DELETE FROM driver_profiles WHERE user_id = user_id_param;
  
  -- 3. Eliminar operadores propietarios
  DELETE FROM owner_operators WHERE user_id = user_id_param;
  
  -- 4. Eliminar perfil general si existe
  DELETE FROM profiles WHERE user_id = user_id_param;
  
  -- 5. Finalmente eliminar del sistema de autenticación usando admin API
  -- Nota: Esto se debe hacer desde una edge function con privilegios admin
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Usuario eliminado exitosamente de las tablas del sistema',
    'user_email', user_email,
    'affected_companies', target_user_companies,
    'note', 'El usuario debe ser eliminado del sistema de autenticación usando la API admin'
  );
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en eliminación permanente de usuario: %', SQLERRM;
END;
$$;