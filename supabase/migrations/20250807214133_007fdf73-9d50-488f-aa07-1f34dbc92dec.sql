-- ================================
-- DOCUMENT MANAGEMENT ACID FUNCTIONS
-- ================================

-- Function to upload/update company documents with validation
CREATE OR REPLACE FUNCTION public.create_or_update_document_with_validation(
  document_data jsonb,
  document_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  result_document RECORD;
  operation_type TEXT;
  existing_count INTEGER;
  file_size_mb NUMERIC;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Extract company_id from document_data
  target_company_id := (document_data->>'company_id')::UUID;
  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id es requerido';
  END IF;

  -- Determine operation type
  operation_type := CASE WHEN document_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para gestionar documentos en esta empresa';
  END IF;

  -- For UPDATE operations, validate document exists and user has access
  IF operation_type = 'UPDATE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM company_documents cd
      JOIN user_company_roles ucr ON cd.company_id = ucr.company_id
      WHERE cd.id = document_id
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

  -- Validate file size (max 50MB)
  IF (document_data->>'file_size')::INTEGER IS NOT NULL THEN
    file_size_mb := (document_data->>'file_size')::INTEGER / 1048576.0;
    IF file_size_mb > 50 THEN
      RAISE EXCEPTION 'El archivo es demasiado grande. Máximo permitido: 50MB. Tamaño actual: %.2f MB', file_size_mb;
    END IF;
  END IF;

  -- Validate content type
  IF NULLIF(document_data->>'content_type', '') IS NOT NULL THEN
    IF NOT (document_data->>'content_type') ~* '^(application|image|text)/' THEN
      RAISE EXCEPTION 'Tipo de archivo no permitido: %', document_data->>'content_type';
    END IF;
  END IF;

  -- Check for duplicate documents of same type within company (exclude current document if updating)
  SELECT COUNT(*) INTO existing_count
  FROM company_documents
  WHERE company_id = target_company_id
  AND document_type = document_data->>'document_type'
  AND (document_id IS NULL OR id != document_id)
  AND is_active = true
  AND expires_at IS NULL OR expires_at > CURRENT_DATE;

  -- For critical documents, only allow one active document per type
  IF existing_count > 0 AND (document_data->>'document_type') IN (
    'insurance_certificate', 'operating_authority', 'business_license'
  ) THEN
    RAISE EXCEPTION 'Ya existe un documento activo del tipo % para esta empresa', document_data->>'document_type';
  END IF;

  -- Validate expiry date if provided
  IF NULLIF(document_data->>'expires_at', '') IS NOT NULL THEN
    IF (document_data->>'expires_at')::DATE <= CURRENT_DATE THEN
      RAISE EXCEPTION 'La fecha de expiración debe ser posterior a hoy';
    END IF;
  END IF;

  -- ================================
  -- 3. CREATE OR UPDATE DOCUMENT
  -- ================================
  
  IF operation_type = 'CREATE' THEN
    INSERT INTO company_documents (
      company_id,
      document_type,
      file_name,
      file_url,
      file_size,
      content_type,
      expires_at,
      notes,
      uploaded_by,
      is_active
    ) VALUES (
      target_company_id,
      document_data->>'document_type',
      document_data->>'file_name',
      document_data->>'file_url',
      NULLIF((document_data->>'file_size'), '')::INTEGER,
      NULLIF(document_data->>'content_type', ''),
      NULLIF((document_data->>'expires_at'), '')::DATE,
      NULLIF(document_data->>'notes', ''),
      current_user_id,
      COALESCE((document_data->>'is_active')::BOOLEAN, true)
    ) RETURNING * INTO result_document;
  ELSE
    UPDATE company_documents SET
      document_type = document_data->>'document_type',
      file_name = document_data->>'file_name',
      file_url = document_data->>'file_url',
      file_size = NULLIF((document_data->>'file_size'), '')::INTEGER,
      content_type = NULLIF(document_data->>'content_type', ''),
      expires_at = NULLIF((document_data->>'expires_at'), '')::DATE,
      notes = NULLIF(document_data->>'notes', ''),
      is_active = COALESCE((document_data->>'is_active')::BOOLEAN, is_active),
      updated_at = now()
    WHERE id = document_id
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
$function$;

-- Function to archive/delete documents with validation
CREATE OR REPLACE FUNCTION public.archive_document_with_validation(
  document_id_param uuid,
  archive_reason text DEFAULT 'Manual archive'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  document_record RECORD;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get document and company info
  SELECT cd.*, cd.company_id INTO document_record
  FROM company_documents cd
  WHERE cd.id = document_id_param AND cd.is_active = true;

  IF document_record IS NULL THEN
    RAISE EXCEPTION 'Documento no encontrado o ya está archivado';
  END IF;

  target_company_id := document_record.company_id;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para archivar documentos en esta empresa';
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Prevent archiving critical active documents
  IF document_record.document_type IN ('insurance_certificate', 'operating_authority') 
     AND (document_record.expires_at IS NULL OR document_record.expires_at > CURRENT_DATE) THEN
    RAISE EXCEPTION 'No se puede archivar un documento crítico activo. Suba un reemplazo primero.';
  END IF;

  -- ================================
  -- 3. ARCHIVE DOCUMENT
  -- ================================
  
  UPDATE company_documents
  SET 
    is_active = false,
    archived_at = now(),
    archived_by = current_user_id,
    notes = COALESCE(notes || E'\n', '') || 'Archivado: ' || archive_reason,
    updated_at = now()
  WHERE id = document_id_param;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Documento archivado exitosamente',
    'document_id', document_id_param,
    'archive_reason', archive_reason,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en archivo ACID de documento: %', SQLERRM;
END;
$function$;

-- Function to restore archived documents with validation
CREATE OR REPLACE FUNCTION public.restore_document_with_validation(document_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  document_record RECORD;
  existing_active_count INTEGER;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get document and company info
  SELECT cd.*, cd.company_id INTO document_record
  FROM company_documents cd
  WHERE cd.id = document_id_param AND cd.is_active = false;

  IF document_record IS NULL THEN
    RAISE EXCEPTION 'Documento no encontrado o ya está activo';
  END IF;

  target_company_id := document_record.company_id;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para restaurar documentos en esta empresa';
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Check for conflicts with existing active documents of same type
  SELECT COUNT(*) INTO existing_active_count
  FROM company_documents
  WHERE company_id = target_company_id
  AND document_type = document_record.document_type
  AND id != document_id_param
  AND is_active = true
  AND (expires_at IS NULL OR expires_at > CURRENT_DATE);

  -- For critical documents, prevent conflicts
  IF existing_active_count > 0 AND document_record.document_type IN (
    'insurance_certificate', 'operating_authority', 'business_license'
  ) THEN
    RAISE EXCEPTION 'Ya existe un documento activo del tipo %. Archive el documento existente primero.', document_record.document_type;
  END IF;

  -- ================================
  -- 3. RESTORE DOCUMENT
  -- ================================
  
  UPDATE company_documents
  SET 
    is_active = true,
    archived_at = NULL,
    archived_by = NULL,
    notes = COALESCE(notes || E'\n', '') || 'Restaurado por: ' || current_user_id || ' en ' || now(),
    updated_at = now()
  WHERE id = document_id_param;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Documento restaurado exitosamente',
    'document_id', document_id_param,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en restauración ACID de documento: %', SQLERRM;
END;
$function$;