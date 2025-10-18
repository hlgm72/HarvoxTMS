-- ====================================================================
-- 🔧 CORRECCIÓN: Simplificar get_load_documents_with_validation
-- ====================================================================
-- 
-- PROBLEMA: La lógica de validación de permisos está causando errores 500
-- SOLUCIÓN: Simplificar la validación para que sea más robusta
-- ====================================================================

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
  created_at timestamp with time zone, 
  updated_at timestamp with time zone, 
  archived_at timestamp with time zone, 
  archived_by uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
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

  -- Return documents
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
  AND ld.archived_at IS NULL
  ORDER BY ld.created_at DESC;

END;
$$;

COMMENT ON FUNCTION get_load_documents_with_validation IS 'FIXED: Simplified permission validation to prevent 500 errors. Now uses simpler company-based access control.';