-- Función para limpiar estados de una carga y resetearla
CREATE OR REPLACE FUNCTION public.reset_load_status_to_assigned(load_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  load_record RECORD;
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

  -- Verificar permisos del usuario en la empresa de la carga
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    JOIN loads l ON l.company_id = ucr.company_id
    WHERE l.id = load_id_param
    AND ucr.user_id = current_user_id
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