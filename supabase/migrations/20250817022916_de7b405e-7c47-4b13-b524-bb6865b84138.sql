-- Create ACID function for deleting load documents with validation
CREATE OR REPLACE FUNCTION public.delete_load_document_with_validation(
  document_id_param UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id UUID;
  result_document RECORD;
  target_load_id UUID;
  target_company_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- ================================
  -- 1. VALIDATE DOCUMENT EXISTS AND GET INFO
  -- ================================
  SELECT * INTO result_document
  FROM load_documents
  WHERE id = document_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento no encontrado';
  END IF;

  target_load_id := result_document.load_id;

  -- Get company_id from the load
  SELECT l.client_id INTO target_company_id
  FROM loads l
  WHERE l.id = target_load_id;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar la empresa del documento';
  END IF;

  -- ================================
  -- 2. VALIDATE PERMISSIONS
  -- ================================
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    JOIN loads l ON l.client_id = ucr.company_id
    WHERE ucr.user_id = current_user_id
    AND l.id = target_load_id
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin', 'driver')
  ) THEN
    RAISE EXCEPTION 'Sin permisos para eliminar documentos de esta carga';
  END IF;

  -- ================================
  -- 3. DELETE DOCUMENT
  -- ================================
  DELETE FROM load_documents
  WHERE id = document_id_param;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Documento eliminado exitosamente',
    'document_info', row_to_json(result_document),
    'deleted_by', current_user_id,
    'deleted_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en eliminación ACID de documento: %', SQLERRM;
END;
$$;