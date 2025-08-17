-- Fix the delete_load_document_with_validation function to properly validate permissions
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

  -- Get company_id from the load's created_by user
  SELECT ucr.company_id INTO target_company_id
  FROM loads l
  JOIN user_company_roles ucr ON l.created_by = ucr.user_id
  WHERE l.id = target_load_id
  AND ucr.is_active = true
  LIMIT 1;

  -- If we can't find via created_by, try through client relationship
  IF target_company_id IS NULL THEN
    SELECT cc.company_id INTO target_company_id
    FROM loads l
    JOIN company_clients cc ON l.client_id = cc.id
    WHERE l.id = target_load_id;
  END IF;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo determinar la empresa del documento';
  END IF;

  -- ================================
  -- 2. VALIDATE PERMISSIONS - User must have access to this company
  -- ================================
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = current_user_id
    AND ucr.company_id = target_company_id
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