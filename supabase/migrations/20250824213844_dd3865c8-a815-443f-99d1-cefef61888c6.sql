-- Actualizar la función para ser más robusta y manejar usuarios que no existen en auth.users
CREATE OR REPLACE FUNCTION public.cleanup_user_data_with_validation(user_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  result_counts JSONB;
  total_deleted INTEGER := 0;
  calculations_deleted INTEGER := 0;
  expenses_deleted INTEGER := 0;
  equipment_deleted INTEGER := 0;
  fuel_cards_deleted INTEGER := 0;
  owner_ops_deleted INTEGER := 0;
  roles_deleted INTEGER := 0;
  invitations_deleted INTEGER := 0;
  profiles_deleted INTEGER := 0;
  user_exists_in_auth BOOLEAN := false;
  user_has_any_data BOOLEAN := false;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Verificar que el usuario actual tiene permisos de company_owner o superadmin
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = current_user_id
    AND ucr.role IN ('company_owner', 'superadmin')
    AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para limpiar datos de usuario';
  END IF;

  -- Verificar si el usuario existe en auth.users
  SELECT EXISTS (SELECT 1 FROM auth.users WHERE id = user_id_param) INTO user_exists_in_auth;

  -- Verificar si el usuario tiene algún dato en nuestras tablas
  SELECT EXISTS (
    SELECT 1 FROM driver_period_calculations WHERE driver_user_id = user_id_param
    UNION ALL
    SELECT 1 FROM expense_instances WHERE user_id = user_id_param
    UNION ALL
    SELECT 1 FROM equipment_assignments WHERE driver_user_id = user_id_param
    UNION ALL
    SELECT 1 FROM driver_fuel_cards WHERE driver_user_id = user_id_param
    UNION ALL
    SELECT 1 FROM owner_operators WHERE user_id = user_id_param
    UNION ALL
    SELECT 1 FROM user_company_roles WHERE user_id = user_id_param
    UNION ALL
    SELECT 1 FROM user_invitations WHERE target_user_id = user_id_param OR email IN (
      SELECT email FROM auth.users WHERE id = user_id_param
    )
    UNION ALL
    SELECT 1 FROM driver_profiles WHERE user_id = user_id_param
    LIMIT 1
  ) INTO user_has_any_data;

  -- Si no existe en auth y no tiene datos, retornar mensaje informativo
  IF NOT user_exists_in_auth AND NOT user_has_any_data THEN
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Usuario no encontrado en el sistema - no hay datos para limpiar',
      'user_id', user_id_param,
      'deleted_counts', jsonb_build_object(),
      'total_deleted', 0,
      'cleaned_by', current_user_id,
      'cleaned_at', now()
    );
  END IF;

  -- 1. Eliminar cálculos de pago (más problemático primero)
  DELETE FROM driver_period_calculations 
  WHERE driver_user_id = user_id_param;
  GET DIAGNOSTICS calculations_deleted = ROW_COUNT;

  -- 2. Eliminar instancias de gastos
  DELETE FROM expense_instances 
  WHERE user_id = user_id_param;
  GET DIAGNOSTICS expenses_deleted = ROW_COUNT;

  -- 3. Eliminar asignaciones de equipos
  DELETE FROM equipment_assignments 
  WHERE driver_user_id = user_id_param;
  GET DIAGNOSTICS equipment_deleted = ROW_COUNT;

  -- 4. Eliminar tarjetas de combustible
  DELETE FROM driver_fuel_cards 
  WHERE driver_user_id = user_id_param;
  GET DIAGNOSTICS fuel_cards_deleted = ROW_COUNT;

  -- 5. Eliminar registros de owner_operators
  DELETE FROM owner_operators 
  WHERE user_id = user_id_param;
  GET DIAGNOSTICS owner_ops_deleted = ROW_COUNT;

  -- 6. Eliminar roles de usuario en empresas
  DELETE FROM user_company_roles 
  WHERE user_id = user_id_param;
  GET DIAGNOSTICS roles_deleted = ROW_COUNT;

  -- 7. Eliminar invitaciones (incluyendo por email si el usuario aún existe en auth)
  DELETE FROM user_invitations 
  WHERE target_user_id = user_id_param 
     OR (user_exists_in_auth AND email IN (
          SELECT email FROM auth.users WHERE id = user_id_param
        ));
  GET DIAGNOSTICS invitations_deleted = ROW_COUNT;

  -- 8. Eliminar perfil de conductor
  DELETE FROM driver_profiles 
  WHERE user_id = user_id_param;
  GET DIAGNOSTICS profiles_deleted = ROW_COUNT;

  -- Calcular total
  total_deleted := calculations_deleted + expenses_deleted + equipment_deleted + 
                   fuel_cards_deleted + owner_ops_deleted + roles_deleted + 
                   invitations_deleted + profiles_deleted;

  -- Preparar resultado
  result_counts := jsonb_build_object(
    'driver_period_calculations', calculations_deleted,
    'expense_instances', expenses_deleted,
    'equipment_assignments', equipment_deleted,
    'driver_fuel_cards', fuel_cards_deleted,
    'owner_operators', owner_ops_deleted,
    'user_company_roles', roles_deleted,
    'user_invitations', invitations_deleted,
    'driver_profiles', profiles_deleted
  );

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', CASE 
      WHEN user_exists_in_auth THEN 'Datos del usuario limpiados exitosamente'
      ELSE 'Datos huérfanos del usuario limpiados exitosamente (usuario ya no existe en el sistema)'
    END,
    'user_id', user_id_param,
    'user_exists_in_auth', user_exists_in_auth,
    'deleted_counts', result_counts,
    'total_deleted', total_deleted,
    'cleaned_by', current_user_id,
    'cleaned_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en limpieza ACID de datos: %', SQLERRM;
END;
$function$;