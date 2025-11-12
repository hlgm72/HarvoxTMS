-- Actualizar función get_load_documents_with_validation para ordenar documentos de más antiguos a más recientes
-- Esto hará que las fotos nuevas aparezcan al final en lugar de al inicio

-- Primero eliminar la función existente
DROP FUNCTION IF EXISTS public.get_load_documents_with_validation(uuid);

-- Recrear la función con el orden ascendente
CREATE OR REPLACE FUNCTION public.get_load_documents_with_validation(target_load_id uuid)
RETURNS TABLE(
  id uuid, 
  load_id uuid, 
  document_type text, 
  file_name text, 
  file_url text, 
  file_size integer, 
  content_type text, 
  uploaded_by uuid, 
  uploaded_at timestamptz, 
  created_at timestamptz, 
  updated_at timestamptz, 
  archived_at timestamptz, 
  archived_by uuid,
  metadata jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_company_id uuid;
  user_role text;
  load_company_id uuid;
BEGIN
  -- Get user's company and role
  SELECT ucr.company_id, ucr.role
  INTO user_company_id, user_role
  FROM user_company_roles ucr
  WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
  LIMIT 1;

  -- Check if user has access to the company
  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'No active company found for user';
  END IF;

  -- Get the load's company
  SELECT l.company_id INTO load_company_id
  FROM loads l
  WHERE l.id = target_load_id;

  -- Verify the load belongs to the user's company
  IF load_company_id IS NULL THEN
    RAISE EXCEPTION 'Load not found';
  END IF;

  IF load_company_id != user_company_id THEN
    RAISE EXCEPTION 'Access denied: Load does not belong to your company';
  END IF;

  -- Return documents ordered by created_at ASC (oldest first, newest last)
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
    ld.uploaded_at,
    ld.created_at,
    ld.updated_at,
    ld.archived_at,
    ld.archived_by,
    ld.metadata
  FROM load_documents ld
  WHERE ld.load_id = target_load_id
  AND ld.archived_at IS NULL
  ORDER BY ld.created_at ASC;

END;
$$;

COMMENT ON FUNCTION get_load_documents_with_validation IS 'Returns load documents ordered chronologically (oldest first, newest last) for better UX when viewing photo thumbnails.';