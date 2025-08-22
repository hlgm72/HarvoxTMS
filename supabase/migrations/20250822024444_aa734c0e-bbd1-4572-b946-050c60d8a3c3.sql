-- Create or update document management functions to handle issue_date

-- Function to create or update company documents with validation (including issue_date)
CREATE OR REPLACE FUNCTION public.create_or_update_document_with_validation(
  document_data jsonb, 
  document_id uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  result_document RECORD;
  operation_type TEXT;
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
      issue_date,
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
      NULLIF((document_data->>'issue_date'), '')::DATE,
      NULLIF((document_data->>'expires_at'), '')::DATE,
      NULLIF(document_data->>'notes', ''),
      current_user_id,
      COALESCE((document_data->>'is_active')::BOOLEAN, true)
    ) RETURNING * INTO result_document;
  ELSE
    UPDATE company_documents SET
      document_type = document_data->>'document_type',
      file_name = document_data->>'file_name',
      file_url = COALESCE(document_data->>'file_url', file_url),
      file_size = COALESCE(NULLIF((document_data->>'file_size'), '')::INTEGER, file_size),
      content_type = COALESCE(NULLIF(document_data->>'content_type', ''), content_type),
      issue_date = COALESCE(NULLIF((document_data->>'issue_date'), '')::DATE, issue_date),
      expires_at = COALESCE(NULLIF((document_data->>'expires_at'), '')::DATE, expires_at),
      notes = COALESCE(NULLIF(document_data->>'notes', ''), notes),
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
    'document_id', result_document.id,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación ACID de documento: %', SQLERRM;
END;
$$;

-- Function to archive documents with validation
CREATE OR REPLACE FUNCTION public.archive_document_with_validation(
  document_id_param uuid,
  archive_reason text DEFAULT 'Manual archive'::text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  result_document RECORD;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- ================================
  -- 1. VALIDATE PERMISSIONS & DOCUMENT EXISTS
  -- ================================
  IF NOT EXISTS (
    SELECT 1 FROM company_documents cd
    JOIN user_company_roles ucr ON cd.company_id = ucr.company_id
    WHERE cd.id = document_id_param
    AND ucr.user_id = current_user_id
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Documento no encontrado o sin permisos para archivarlo';
  END IF;

  -- Check if already archived
  IF EXISTS (
    SELECT 1 FROM company_documents
    WHERE id = document_id_param AND is_active = false
  ) THEN
    RAISE EXCEPTION 'El documento ya está archivado';
  END IF;

  -- ================================
  -- 2. ARCHIVE DOCUMENT
  -- ================================
  
  UPDATE company_documents SET
    is_active = false,
    archived_at = now(),
    archived_by = current_user_id,
    updated_at = now()
  WHERE id = document_id_param
  RETURNING * INTO result_document;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Documento archivado exitosamente',
    'document', row_to_json(result_document),
    'document_id', result_document.id,
    'archive_reason', archive_reason,
    'archived_by', current_user_id,
    'archived_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en archivo ACID de documento: %', SQLERRM;
END;
$$;

-- Function to restore archived documents with validation
CREATE OR REPLACE FUNCTION public.restore_document_with_validation(
  document_id_param uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  result_document RECORD;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- ================================
  -- 1. VALIDATE PERMISSIONS & DOCUMENT EXISTS
  -- ================================
  IF NOT EXISTS (
    SELECT 1 FROM company_documents cd
    JOIN user_company_roles ucr ON cd.company_id = ucr.company_id
    WHERE cd.id = document_id_param
    AND ucr.user_id = current_user_id
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Documento no encontrado o sin permisos para restaurarlo';
  END IF;

  -- Check if already active
  IF EXISTS (
    SELECT 1 FROM company_documents
    WHERE id = document_id_param AND is_active = true
  ) THEN
    RAISE EXCEPTION 'El documento ya está activo';
  END IF;

  -- ================================
  -- 2. RESTORE DOCUMENT
  -- ================================
  
  UPDATE company_documents SET
    is_active = true,
    archived_at = NULL,
    archived_by = NULL,
    updated_at = now()
  WHERE id = document_id_param
  RETURNING * INTO result_document;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Documento restaurado exitosamente',
    'document', row_to_json(result_document),
    'document_id', result_document.id,
    'restored_by', current_user_id,
    'restored_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en restauración ACID de documento: %', SQLERRM;
END;
$$;