-- También corregir función reset_load_status_to_assigned para no usar company_id en tabla loads
CREATE OR REPLACE FUNCTION public.reset_load_status_to_assigned(load_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  load_record RECORD;
  target_company_id UUID;
  result JSONB;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Verificar que la carga existe
  SELECT * INTO load_record
  FROM loads
  WHERE id = load_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Carga no encontrada'
    );
  END IF;

  -- Obtener company_id a través del driver_user_id o del usuario actual
  IF load_record.driver_user_id IS NOT NULL THEN
    SELECT ucr.company_id INTO target_company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = load_record.driver_user_id
    AND ucr.is_active = true
    LIMIT 1;
  ELSE
    -- Si no hay conductor asignado, usar la empresa del usuario actual
    SELECT ucr.company_id INTO target_company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = current_user_id
    AND ucr.is_active = true
    LIMIT 1;
  END IF;

  IF target_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No se pudo determinar la empresa de la carga'
    );
  END IF;

  -- Verificar permisos del usuario en la empresa
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = current_user_id
    AND ucr.company_id = target_company_id
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Sin permisos para modificar esta carga'
    );
  END IF;

  -- Eliminar todo el historial de estados
  DELETE FROM load_status_history
  WHERE load_id = load_id_param;

  -- Resetear el estado de la carga a 'assigned'
  UPDATE loads
  SET 
    status = 'assigned',
    updated_at = now()
  WHERE id = load_id_param;

  -- Crear un nuevo registro inicial en el historial
  INSERT INTO load_status_history (
    load_id,
    previous_status,
    new_status,
    changed_by,
    changed_at,
    notes
  ) VALUES (
    load_id_param,
    load_record.status,
    'assigned',
    current_user_id,
    now(),
    'Estado reseteado a assigned - historial limpiado'
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Estado de la carga reseteado exitosamente',
    'load_id', load_id_param,
    'previous_status', load_record.status,
    'new_status', 'assigned',
    'reset_by', current_user_id,
    'reset_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error reseteando estado de carga: %', SQLERRM;
END;
$function$;