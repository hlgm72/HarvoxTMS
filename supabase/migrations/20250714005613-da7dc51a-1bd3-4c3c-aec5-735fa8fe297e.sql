-- Crear función para eliminación permanente de documentos de empresa (solo Company Owner)
CREATE OR REPLACE FUNCTION public.delete_company_document_permanently(document_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  doc_record RECORD;
  result JSONB;
BEGIN
  -- Verificar que el usuario es Company Owner
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    JOIN company_documents cd ON cd.company_id = ucr.company_id
    WHERE cd.id = document_id 
    AND ucr.user_id = auth.uid() 
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Solo los propietarios de empresa pueden eliminar documentos permanentemente'
    );
  END IF;

  -- Obtener información del documento antes de eliminarlo
  SELECT cd.*, c.name as company_name INTO doc_record
  FROM company_documents cd
  JOIN companies c ON cd.company_id = c.id
  WHERE cd.id = document_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Documento no encontrado'
    );
  END IF;

  -- Registrar la eliminación en system_stats para auditoría
  INSERT INTO system_stats (stat_type, stat_value)
  VALUES ('document_permanent_deletion', jsonb_build_object(
    'document_id', document_id,
    'file_name', doc_record.file_name,
    'document_type', doc_record.document_type,
    'company_id', doc_record.company_id,
    'company_name', doc_record.company_name,
    'deleted_by', auth.uid(),
    'deleted_at', now(),
    'original_created_at', doc_record.created_at,
    'was_active', doc_record.is_active
  ));

  -- Eliminar el documento permanentemente
  DELETE FROM company_documents WHERE id = document_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Documento eliminado permanentemente',
    'audit_logged', true
  );
END;
$$;