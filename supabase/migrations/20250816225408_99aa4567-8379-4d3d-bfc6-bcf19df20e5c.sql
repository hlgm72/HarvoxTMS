-- Corregir la función update_load_status_with_validation
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
  user_company_ids UUID[];
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get load record
  SELECT * INTO load_record
  FROM loads
  WHERE id = load_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carga no encontrada';
  END IF;

  -- Get user's company IDs
  SELECT ARRAY_AGG(company_id) INTO user_company_ids
  FROM user_company_roles
  WHERE user_id = current_user_id
  AND is_active = true;

  -- Validate user has access to this load (either as driver or company member)
  IF NOT (
    -- User is the assigned driver
    load_record.driver_user_id = current_user_id 
    OR 
    -- User belongs to company that has drivers or clients related to this load
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = load_record.driver_user_id
      AND ucr.company_id = ANY(user_company_ids)
      AND ucr.is_active = true
    )
    OR
    -- User belongs to company of the client
    EXISTS (
      SELECT 1 FROM company_clients cc
      WHERE cc.id = load_record.client_id
      AND cc.company_id = ANY(user_company_ids)
    )
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
    updated_at = now()
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