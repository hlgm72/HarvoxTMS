-- Corregir la función para manejar usuarios huérfanos correctamente
CREATE OR REPLACE FUNCTION public.can_user_be_permanently_deleted(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  user_exists_in_auth BOOLEAN := false;
BEGIN
  -- Verificar si el usuario existe en auth.users
  SELECT au.email INTO user_email
  FROM auth.users au
  WHERE au.id = user_id_param;
  
  user_exists_in_auth := user_email IS NOT NULL;
  
  -- Si no existe en auth, es un usuario huérfano - verificar solo datos residuales
  IF NOT user_exists_in_auth THEN
    -- Verificar si hay datos residuales que justifiquen la "limpieza"
    SELECT 
      COALESCE((SELECT COUNT(*) FROM driver_period_calculations WHERE driver_user_id = user_id_param), 0) +
      COALESCE((SELECT COUNT(*) FROM expense_instances WHERE user_id = user_id_param), 0) +
      COALESCE((SELECT COUNT(*) FROM equipment_assignments WHERE driver_user_id = user_id_param), 0) +
      COALESCE((SELECT COUNT(*) FROM driver_fuel_cards WHERE driver_user_id = user_id_param), 0) +
      COALESCE((SELECT COUNT(*) FROM owner_operators WHERE user_id = user_id_param), 0) +
      COALESCE((SELECT COUNT(*) FROM user_company_roles WHERE user_id = user_id_param), 0) +
      COALESCE((SELECT COUNT(*) FROM user_invitations WHERE target_user_id = user_id_param), 0) +
      COALESCE((SELECT COUNT(*) FROM driver_profiles WHERE user_id = user_id_param), 0)
    INTO payment_calculations_count;
    
    RETURN jsonb_build_object(
      'can_delete', true,
      'reason', CASE 
        WHEN payment_calculations_count > 0 THEN 'Usuario huérfano con datos residuales - se puede limpiar'
        ELSE 'Usuario huérfano sin datos residuales'
      END,
      'blocking_factors', ARRAY[]::TEXT[],
      'user_email', null,
      'is_orphaned_user', true,
      'residual_data_count', payment_calculations_count
    );
  END IF;
  
  -- Usuario existe en auth - verificar datos críticos
  
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
    'is_orphaned_user', false,
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
          'Se recomienda usar "Limpiar Datos" primero y luego eliminar, o desactivar el usuario para preservar la integridad de los datos históricos'
      END
  );
  
  RETURN result;
END;
$function$;