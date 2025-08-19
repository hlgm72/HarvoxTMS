-- Corregir la función create_or_update_load_document_with_validation para usar la estructura correcta de la tabla
CREATE OR REPLACE FUNCTION public.create_or_update_load_document_with_validation(
  document_data jsonb,
  document_id uuid DEFAULT NULL
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
  operation_type := CASE WHEN document_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  -- Check if user has access to this load via company roles
  IF NOT EXISTS (
    SELECT 1 FROM loads l
    JOIN user_company_roles ucr ON l.created_by = ucr.user_id
    WHERE l.id = target_load_id
    AND ucr.user_id = current_user_id
    AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para gestionar documentos de esta carga';
  END IF;

  -- For UPDATE operations, validate document exists and user has access
  IF operation_type = 'UPDATE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM load_documents ld
      JOIN loads l ON ld.load_id = l.id
      JOIN user_company_roles ucr ON l.created_by = ucr.user_id
      WHERE ld.id = document_id
      AND ucr.user_id = current_user_id
      AND ucr.is_active = true
    ) THEN
      RAISE EXCEPTION 'Documento no encontrado o sin permisos para modificarlo';
    END IF;
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Validate required fields
  IF NULLIF(document_data->>'document_type', '') IS NULL THEN
    RAISE EXCEPTION 'document_type es requerido';
  END IF;

  IF NULLIF(document_data->>'file_name', '') IS NULL THEN
    RAISE EXCEPTION 'file_name es requerido';
  END IF;

  IF NULLIF(document_data->>'file_url', '') IS NULL THEN
    RAISE EXCEPTION 'file_url es requerido';
  END IF;

  -- ================================
  -- 3. CREATE OR UPDATE DOCUMENT
  -- ================================
  
  IF operation_type = 'CREATE' THEN
    INSERT INTO load_documents (
      load_id,
      document_type,
      file_name,
      file_url,
      file_size,
      content_type,
      metadata,
      uploaded_by
    ) VALUES (
      target_load_id,
      document_data->>'document_type',
      document_data->>'file_name',
      document_data->>'file_url',
      NULLIF((document_data->>'file_size'), '')::INTEGER,
      NULLIF(document_data->>'content_type', ''),
      COALESCE((document_data->>'metadata')::jsonb, '{}'::jsonb),
      current_user_id
    ) RETURNING * INTO result_document;
  ELSE
    UPDATE load_documents SET
      document_type = document_data->>'document_type',
      file_name = document_data->>'file_name',
      file_url = document_data->>'file_url',
      file_size = NULLIF((document_data->>'file_size'), '')::INTEGER,
      content_type = NULLIF(document_data->>'content_type', ''),
      metadata = COALESCE((document_data->>'metadata')::jsonb, metadata),
      updated_at = now()
    WHERE id = document_id
    RETURNING * INTO result_document;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', CASE 
      WHEN operation_type = 'CREATE' THEN 'Documento de carga creado exitosamente'
      ELSE 'Documento de carga actualizado exitosamente'
    END,
    'document', row_to_json(result_document),
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación ACID de documento de carga: %', SQLERRM;
END;
$$;