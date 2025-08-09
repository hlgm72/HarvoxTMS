-- Función para verificar si un usuario puede ser eliminado completamente del sistema
-- Esta función verifica si el usuario tiene transacciones o datos críticos registrados

CREATE OR REPLACE FUNCTION public.can_user_be_permanently_deleted(user_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  user_email TEXT;
  loads_count INTEGER := 0;
  fuel_expenses_count INTEGER := 0;
  equipment_assignments_count INTEGER := 0;
  payment_calculations_count INTEGER := 0;
  created_documents_count INTEGER := 0;
  created_companies_count INTEGER := 0;
  result JSONB;
  blocking_reasons TEXT[] := ARRAY[]::TEXT[];
BEGIN
  -- Verificar que el usuario existe en auth.users
  SELECT au.email INTO user_email
  FROM auth.users au
  WHERE au.id = user_id_param;
  
  IF user_email IS NULL THEN
    RETURN jsonb_build_object(
      'can_delete', false,
      'reason', 'Usuario no encontrado en el sistema de autenticación',
      'blocking_factors', ARRAY[]::TEXT[],
      'user_email', null
    );
  END IF;
  
  -- Verificar cargas asignadas al usuario
  SELECT COUNT(*) INTO loads_count
  FROM loads
  WHERE driver_user_id = user_id_param;
  
  IF loads_count > 0 THEN
    blocking_reasons := array_append(blocking_reasons, 
      loads_count || ' cargas registradas como conductor');
  END IF;
  
  -- Verificar gastos de combustible
  SELECT COUNT(*) INTO fuel_expenses_count
  FROM fuel_expenses
  WHERE driver_user_id = user_id_param;
  
  IF fuel_expenses_count > 0 THEN
    blocking_reasons := array_append(blocking_reasons, 
      fuel_expenses_count || ' gastos de combustible registrados');
  END IF;
  
  -- Verificar asignaciones de equipos
  SELECT COUNT(*) INTO equipment_assignments_count
  FROM equipment_assignments
  WHERE driver_user_id = user_id_param;
  
  IF equipment_assignments_count > 0 THEN
    blocking_reasons := array_append(blocking_reasons, 
      equipment_assignments_count || ' asignaciones de equipos registradas');
  END IF;
  
  -- Verificar cálculos de períodos de pago
  SELECT COUNT(*) INTO payment_calculations_count
  FROM driver_period_calculations
  WHERE driver_user_id = user_id_param;
  
  IF payment_calculations_count > 0 THEN
    blocking_reasons := array_append(blocking_reasons, 
      payment_calculations_count || ' cálculos de pagos registrados');
  END IF;
  
  -- Verificar documentos creados por el usuario
  SELECT COUNT(*) INTO created_documents_count
  FROM company_documents
  WHERE uploaded_by = user_id_param;
  
  IF created_documents_count > 0 THEN
    blocking_reasons := array_append(blocking_reasons, 
      created_documents_count || ' documentos subidos por el usuario');
  END IF;
  
  -- Verificar empresas creadas por el usuario
  SELECT COUNT(*) INTO created_companies_count
  FROM companies
  WHERE id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = user_id_param 
    AND role = 'company_owner'
  );
  
  IF created_companies_count > 0 THEN
    blocking_reasons := array_append(blocking_reasons, 
      created_companies_count || ' empresas donde es propietario');
  END IF;
  
  -- Construir el resultado
  result := jsonb_build_object(
    'can_delete', array_length(blocking_reasons, 1) IS NULL,
    'user_email', user_email,
    'blocking_factors', blocking_reasons,
    'summary', jsonb_build_object(
      'loads_as_driver', loads_count,
      'fuel_expenses', fuel_expenses_count,
      'equipment_assignments', equipment_assignments_count,
      'payment_calculations', payment_calculations_count,
      'uploaded_documents', created_documents_count,
      'owned_companies', created_companies_count
    ),
    'recommendation', 
      CASE 
        WHEN array_length(blocking_reasons, 1) IS NULL THEN 
          'El usuario puede ser eliminado completamente del sistema sin afectar datos críticos'
        ELSE 
          'Se recomienda desactivar el usuario en lugar de eliminarlo para preservar la integridad de los datos históricos'
      END
  );
  
  RETURN result;
END;
$$;

-- Función para eliminar permanentemente un usuario después de validaciones
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
BEGIN
  -- Verificar usuario autenticado
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- Verificar que el usuario actual es superadmin
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND role = 'superadmin'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Solo los superadministradores pueden eliminar usuarios permanentemente';
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
  
  -- Obtener empresas del usuario antes de eliminar
  SELECT ARRAY(
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = user_id_param
  ) INTO target_user_companies;
  
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