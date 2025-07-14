-- Agregar campos para archivado en company_documents
ALTER TABLE public.company_documents 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

-- Agregar campos para archivado en equipment_documents  
ALTER TABLE public.equipment_documents
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

-- Agregar campos para archivado en load_documents
ALTER TABLE public.load_documents
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

-- Crear función para archivar documentos de empresa
CREATE OR REPLACE FUNCTION public.archive_company_document(document_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Verificar que el documento existe y el usuario tiene permisos
  IF NOT EXISTS (
    SELECT 1 FROM company_documents cd
    JOIN user_company_roles ucr ON cd.company_id = ucr.company_id
    WHERE cd.id = document_id 
    AND ucr.user_id = auth.uid() 
    AND ucr.is_active = true
    AND cd.is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Documento no encontrado o sin permisos'
    );
  END IF;

  -- Archivar el documento
  UPDATE company_documents 
  SET 
    is_active = false,
    archived_at = now(),
    archived_by = auth.uid(),
    updated_at = now()
  WHERE id = document_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Documento archivado exitosamente'
  );
END;
$$;

-- Crear función para restaurar documentos de empresa
CREATE OR REPLACE FUNCTION public.restore_company_document(document_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result JSONB;
BEGIN
  -- Verificar que el documento existe y el usuario tiene permisos
  IF NOT EXISTS (
    SELECT 1 FROM company_documents cd
    JOIN user_company_roles ucr ON cd.company_id = ucr.company_id
    WHERE cd.id = document_id 
    AND ucr.user_id = auth.uid() 
    AND ucr.is_active = true
    AND cd.is_active = false
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Documento archivado no encontrado o sin permisos'
    );
  END IF;

  -- Restaurar el documento
  UPDATE company_documents 
  SET 
    is_active = true,
    archived_at = NULL,
    archived_by = NULL,
    updated_at = now()
  WHERE id = document_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Documento restaurado exitosamente'
  );
END;
$$;