-- Crear función SECURITY DEFINER para leer documentos de carga
CREATE OR REPLACE FUNCTION public.get_load_documents_with_validation(
  target_load_id uuid
)
RETURNS TABLE(
  id uuid,
  load_id uuid,
  document_type text,
  file_name text,
  file_url text,
  file_size integer,
  content_type text,
  uploaded_by uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  archived_at timestamp with time zone,
  archived_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

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
    RAISE EXCEPTION 'Sin permisos para ver documentos de esta carga';
  END IF;

  -- ================================
  -- 2. RETURN DOCUMENTS
  -- ================================
  RETURN QUERY
  SELECT 
    ld.id,
    ld.load_id,
    ld.document_type,
    ld.file_name,
    ld.file_url,
    ld.file_size,
    ld.content_type,
    ld.uploaded_by,
    ld.created_at,
    ld.updated_at,
    ld.archived_at,
    ld.archived_by
  FROM load_documents ld
  WHERE ld.load_id = target_load_id
  AND ld.archived_at IS NULL -- Solo documentos activos
  ORDER BY ld.created_at DESC;

END;
$$;