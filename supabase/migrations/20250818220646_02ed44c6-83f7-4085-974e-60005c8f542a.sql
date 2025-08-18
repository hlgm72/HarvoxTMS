-- Create function to handle load document validation and deletion
CREATE OR REPLACE FUNCTION delete_load_document_with_validation(document_id_param UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  current_user_id UUID;
  doc_record RECORD;
  load_record RECORD;
  validation_result RECORD;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get document information
  SELECT ld.*, l.status as load_status, l.id as load_id
  INTO doc_record
  FROM load_documents ld
  JOIN loads l ON ld.load_id = l.id
  WHERE ld.id = document_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento no encontrado';
  END IF;

  -- Check if user has permission to access this load
  IF NOT EXISTS (
    SELECT 1 FROM loads l
    JOIN user_company_roles ucr ON l.company_id = ucr.company_id
    WHERE l.id = doc_record.load_id
    AND ucr.user_id = current_user_id
    AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para gestionar documentos de esta carga';
  END IF;

  -- Validate if document can be deleted based on load status
  -- Work in progress statuses where documents are protected
  IF doc_record.load_status IN ('en_route_pickup', 'at_pickup', 'loaded', 'en_route_delivery', 'at_delivery', 'delivered') THEN
    -- Rate Confirmation and Load Order cannot be deleted when work is in progress
    IF doc_record.document_type IN ('rate_confirmation', 'load_order') THEN
      RAISE EXCEPTION 'No se puede eliminar % mientras la carga está en progreso. Puede reemplazarlo o regenerarlo.', 
        CASE 
          WHEN doc_record.document_type = 'rate_confirmation' THEN 'el Rate Confirmation'
          WHEN doc_record.document_type = 'load_order' THEN 'el Load Order'
        END;
    END IF;
  END IF;

  -- Perform the deletion by marking as archived
  UPDATE load_documents
  SET 
    archived_at = now(),
    archived_by = current_user_id,
    updated_at = now()
  WHERE id = document_id_param;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Documento eliminado exitosamente',
    'document_id', document_id_param,
    'document_type', doc_record.document_type,
    'load_id', doc_record.load_id,
    'deleted_by', current_user_id,
    'deleted_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en eliminación de documento: %', SQLERRM;
END;
$$;