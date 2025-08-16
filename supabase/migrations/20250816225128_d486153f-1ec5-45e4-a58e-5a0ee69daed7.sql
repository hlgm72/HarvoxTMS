-- Eliminar las funciones duplicadas y crear una única función
DROP FUNCTION IF EXISTS public.update_load_status_with_validation(uuid, text);
DROP FUNCTION IF EXISTS public.update_load_status_with_validation(uuid, text, text);

-- Crear una única función que maneje todos los casos
CREATE OR REPLACE FUNCTION public.update_load_status_with_validation(
  load_id_param uuid,
  new_status text,
  status_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  load_record RECORD;
  company_id_val UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get load and validate access
  SELECT l.*, l.company_id INTO load_record
  FROM loads l
  WHERE l.id = load_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carga no encontrada';
  END IF;

  company_id_val := load_record.company_id;

  -- Validate user has access to this load
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = current_user_id
    AND ucr.company_id = company_id_val
    AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para actualizar esta carga';
  END IF;

  -- Validate status transition is allowed
  IF load_record.status = new_status THEN
    RAISE EXCEPTION 'La carga ya está en el estado %', new_status;
  END IF;

  -- Update the load status
  UPDATE loads
  SET 
    status = new_status,
    status_updated_at = now(),
    status_updated_by = current_user_id
  WHERE id = load_id_param;

  -- Return success
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Estado de carga actualizado exitosamente',
    'load_id', load_id_param,
    'new_status', new_status,
    'updated_at', now(),
    'updated_by', current_user_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error actualizando estado de carga: %', SQLERRM;
END;
$$;