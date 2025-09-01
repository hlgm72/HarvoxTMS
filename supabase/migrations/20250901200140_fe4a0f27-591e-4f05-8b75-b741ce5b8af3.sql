-- Create ACID load deletion function with proper validation
CREATE OR REPLACE FUNCTION public.delete_load_with_validation(load_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  load_record RECORD;
  result_data JSONB;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Error en eliminación ACID de carga: Usuario no autenticado';
  END IF;

  -- Get load record and verify it exists
  SELECT * INTO load_record
  FROM loads 
  WHERE id = load_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Error en eliminación ACID de carga: Carga no encontrada';
  END IF;

  -- Verify user has permissions to delete this load
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = current_user_id
    AND ucr.company_id = load_record.company_id
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Error en eliminación ACID de carga: Sin permisos para eliminar esta carga';
  END IF;

  -- Start ACID transaction for deletion
  BEGIN
    -- Delete related records first (maintaining referential integrity)
    
    -- Delete load documents
    DELETE FROM load_documents WHERE load_id = load_id_param;
    
    -- Delete load status history
    DELETE FROM load_status_history WHERE load_id = load_id_param;
    
    -- Delete load photos if any
    DELETE FROM load_photos WHERE load_id = load_id_param;
    
    -- Finally delete the load itself
    DELETE FROM loads WHERE id = load_id_param;

    -- Return success result
    result_data := jsonb_build_object(
      'success', true,
      'message', 'Carga eliminada exitosamente',
      'load_id', load_id_param,
      'deleted_by', current_user_id,
      'deleted_at', now()
    );

  EXCEPTION WHEN OTHERS THEN
    -- Roll back any changes and re-raise the error
    RAISE EXCEPTION 'Error en eliminación ACID de carga: %', SQLERRM;
  END;

  RETURN result_data;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en eliminación ACID de carga: %', SQLERRM;
END;
$$;