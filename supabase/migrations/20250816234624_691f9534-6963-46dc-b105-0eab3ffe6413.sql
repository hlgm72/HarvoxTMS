-- Crear una función SECURITY DEFINER para manejar la inserción de documentos
-- Esto evita los problemas de RLS y proporciona un control de acceso más robusto

CREATE OR REPLACE FUNCTION public.create_or_update_load_document_with_validation(
  document_data jsonb,
  existing_doc_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  target_load_id UUID;
  result_document RECORD;
  operation_type TEXT;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Extract load_id from document_data
  target_load_id := (document_data->>'load_id')::UUID;
  IF target_load_id IS NULL THEN
    RAISE EXCEPTION 'load_id es requerido';
  END IF;

  -- Determine operation type
  operation_type := CASE WHEN existing_doc_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  IF NOT EXISTS (
    SELECT 1 FROM loads l
    JOIN user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by = ucr.user_id OR
      ucr.user_id = current_user_id
    )
    WHERE l.id = target_load_id
    AND ucr.company_id IN (
      SELECT company_id
      FROM user_company_roles
      WHERE user_id = current_user_id AND is_active = true
    )
    AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para gestionar documentos de esta carga';
  END IF;

  -- ================================
  -- 2. CREATE OR UPDATE DOCUMENT
  -- ================================
  
  IF operation_type = 'CREATE' THEN
    INSERT INTO load_documents (
      load_id,
      document_type,
      file_name,
      file_size,
      file_url,
      content_type,
      uploaded_by
    ) VALUES (
      target_load_id,
      document_data->>'document_type',
      document_data->>'file_name',
      NULLIF((document_data->>'file_size'), '')::INTEGER,
      document_data->>'file_url',
      NULLIF(document_data->>'content_type', ''),
      current_user_id
    ) RETURNING * INTO result_document;
  ELSE
    UPDATE load_documents SET
      document_type = document_data->>'document_type',
      file_name = document_data->>'file_name',
      file_size = NULLIF((document_data->>'file_size'), '')::INTEGER,
      file_url = document_data->>'file_url',
      content_type = NULLIF(document_data->>'content_type', ''),
      updated_at = now()
    WHERE id = existing_doc_id
    RETURNING * INTO result_document;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', CASE 
      WHEN operation_type = 'CREATE' THEN 'Documento creado exitosamente'
      ELSE 'Documento actualizado exitosamente'
    END,
    'document', row_to_json(result_document),
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación ACID de documento: %', SQLERRM;
END;
$$;