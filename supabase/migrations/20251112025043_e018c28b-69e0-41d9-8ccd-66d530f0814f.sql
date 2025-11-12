-- Corregir función get_load_documents_with_validation con el orden ASC
-- La tabla loads no tiene company_id, se obtiene a través de user_company_roles

DROP FUNCTION IF EXISTS public.get_load_documents_with_validation(uuid);

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
  current_user_id UUID;
  load_company_id UUID;
  user_company_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get user's company
  SELECT company_id INTO user_company_id
  FROM user_company_roles
  WHERE user_id = current_user_id
  AND is_active = true
  LIMIT 1;

  IF user_company_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no tiene compañía activa';
  END IF;

  -- Get load's company (through driver or creator)
  SELECT COALESCE(
    (SELECT ucr.company_id FROM user_company_roles ucr WHERE ucr.user_id = l.driver_user_id AND ucr.is_active = true LIMIT 1),
    (SELECT ucr.company_id FROM user_company_roles ucr WHERE ucr.user_id = l.created_by AND ucr.is_active = true LIMIT 1)
  ) INTO load_company_id
  FROM loads l
  WHERE l.id = target_load_id;

  -- Validate that user has access to this load's company
  IF load_company_id IS NULL OR load_company_id != user_company_id THEN
    RAISE EXCEPTION 'Sin permisos para ver documentos de esta carga';
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