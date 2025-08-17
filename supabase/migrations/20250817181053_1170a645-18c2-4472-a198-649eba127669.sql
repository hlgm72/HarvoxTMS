-- Corregir funciones con search_path fijo para seguridad

-- Función para eliminar archivos del storage cuando se elimina un documento de load
CREATE OR REPLACE FUNCTION delete_load_document_storage_file()
RETURNS TRIGGER AS $$
DECLARE
  storage_path TEXT;
BEGIN
  -- Extraer el path del storage desde file_url
  IF OLD.file_url IS NOT NULL THEN
    -- Si es una URL completa de Supabase, extraer solo el path
    IF OLD.file_url LIKE '%supabase.co/storage/v1/object/public/load-documents/%' THEN
      storage_path := SUBSTRING(OLD.file_url FROM '.*/load-documents/(.*)');
    ELSIF OLD.file_url LIKE '%supabase.co/storage/v1/object/load-documents/%' THEN
      storage_path := SUBSTRING(OLD.file_url FROM '.*/load-documents/(.*)');
    ELSE
      -- Asumir que ya es un path relativo
      storage_path := OLD.file_url;
    END IF;
    
    -- Eliminar archivo del storage si tenemos un path válido
    IF storage_path IS NOT NULL AND storage_path != '' THEN
      BEGIN
        PERFORM storage.delete_object('load-documents', storage_path);
        RAISE NOTICE 'Archivo eliminado del storage: %', storage_path;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'No se pudo eliminar archivo del storage: % - Error: %', storage_path, SQLERRM;
      END;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Función para eliminar archivos del storage cuando se elimina un documento de company
CREATE OR REPLACE FUNCTION delete_company_document_storage_file()
RETURNS TRIGGER AS $$
DECLARE
  storage_path TEXT;
BEGIN
  -- Extraer el path del storage desde file_url
  IF OLD.file_url IS NOT NULL THEN
    -- Si es una URL completa de Supabase, extraer solo el path
    IF OLD.file_url LIKE '%supabase.co/storage/v1/object/public/company-documents/%' THEN
      storage_path := SUBSTRING(OLD.file_url FROM '.*/company-documents/(.*)');
    ELSIF OLD.file_url LIKE '%supabase.co/storage/v1/object/company-documents/%' THEN
      storage_path := SUBSTRING(OLD.file_url FROM '.*/company-documents/(.*)');
    ELSE
      -- Asumir que ya es un path relativo
      storage_path := OLD.file_url;
    END IF;
    
    -- Eliminar archivo del storage si tenemos un path válido
    IF storage_path IS NOT NULL AND storage_path != '' THEN
      BEGIN
        PERFORM storage.delete_object('company-documents', storage_path);
        RAISE NOTICE 'Archivo eliminado del storage: %', storage_path;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'No se pudo eliminar archivo del storage: % - Error: %', storage_path, SQLERRM;
      END;
    END IF;
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Función ACID mejorada para eliminar documentos de load con storage
CREATE OR REPLACE FUNCTION delete_load_document_with_validation(document_id_param UUID)
RETURNS jsonb AS $$
DECLARE
  current_user_id UUID;
  doc_record RECORD;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get document information and validate access through client relationship
  SELECT ld.*, cc.company_id INTO doc_record
  FROM load_documents ld
  JOIN loads l ON ld.load_id = l.id
  JOIN company_clients cc ON l.client_id = cc.id
  WHERE ld.id = document_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Documento no encontrado';
  END IF;

  -- Validate user has access to this company
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = doc_record.company_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para eliminar este documento';
  END IF;

  -- Delete document (trigger will handle storage cleanup)
  DELETE FROM load_documents WHERE id = document_id_param;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Documento eliminado exitosamente (incluido archivo del storage)',
    'document_id', document_id_param,
    'deleted_by', current_user_id,
    'deleted_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error eliminando documento: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';

-- Función ACID mejorada para crear/actualizar documentos de load con reemplazo
CREATE OR REPLACE FUNCTION create_or_update_load_document_with_validation(
  load_id_param UUID,
  document_data JSONB,
  document_id_param UUID DEFAULT NULL,
  replace_existing BOOLEAN DEFAULT FALSE
)
RETURNS jsonb AS $$
DECLARE
  current_user_id UUID;
  load_record RECORD;
  existing_doc_record RECORD;
  result_document RECORD;
  operation_type TEXT;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validate load exists and user has access through client relationship
  SELECT l.*, cc.company_id INTO load_record
  FROM loads l
  JOIN company_clients cc ON l.client_id = cc.id
  WHERE l.id = load_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carga no encontrada';
  END IF;

  -- Validate user permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = load_record.company_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para gestionar documentos en esta empresa';
  END IF;

  -- Handle replacement logic
  IF replace_existing AND document_data->>'document_type' IS NOT NULL THEN
    -- Find existing document of same type to replace
    SELECT * INTO existing_doc_record
    FROM load_documents
    WHERE load_id = load_id_param
    AND document_type = (document_data->>'document_type')::document_type
    AND archived_at IS NULL;

    IF FOUND THEN
      -- Delete existing document (trigger will handle storage cleanup)
      DELETE FROM load_documents WHERE id = existing_doc_record.id;
      RAISE NOTICE 'Documento existente reemplazado: %', existing_doc_record.id;
    END IF;
  END IF;

  -- Determine operation type
  operation_type := CASE WHEN document_id_param IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  -- Create or update document
  IF operation_type = 'CREATE' THEN
    INSERT INTO load_documents (
      load_id,
      document_type,
      file_name,
      file_url,
      file_size,
      content_type,
      uploaded_by
    ) VALUES (
      load_id_param,
      (document_data->>'document_type')::document_type,
      document_data->>'file_name',
      document_data->>'file_url',
      NULLIF((document_data->>'file_size'), '')::INTEGER,
      NULLIF(document_data->>'content_type', ''),
      current_user_id
    ) RETURNING * INTO result_document;
  ELSE
    UPDATE load_documents SET
      document_type = COALESCE((document_data->>'document_type')::document_type, document_type),
      file_name = COALESCE(document_data->>'file_name', file_name),
      file_url = COALESCE(document_data->>'file_url', file_url),
      file_size = COALESCE(NULLIF((document_data->>'file_size'), '')::INTEGER, file_size),
      content_type = COALESCE(NULLIF(document_data->>'content_type', ''), content_type),
      updated_at = now()
    WHERE id = document_id_param
    RETURNING * INTO result_document;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', CASE 
      WHEN operation_type = 'CREATE' THEN 'Documento creado exitosamente'
      ELSE 'Documento actualizado exitosamente'
    END,
    'document', row_to_json(result_document),
    'replaced_existing', replace_existing AND existing_doc_record.id IS NOT NULL,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación ACID de documento: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';