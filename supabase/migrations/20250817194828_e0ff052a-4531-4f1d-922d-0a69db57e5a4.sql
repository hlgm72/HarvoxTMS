-- Corregir la función de eliminación del storage para load documents
CREATE OR REPLACE FUNCTION delete_load_document_storage_file()
RETURNS TRIGGER AS $$
DECLARE
  storage_path TEXT;
  bucket_name TEXT := 'load-documents';
BEGIN
  -- Solo proceder si tenemos un file_url
  IF OLD.file_url IS NULL OR OLD.file_url = '' THEN
    RAISE NOTICE 'No hay file_url para eliminar del storage';
    RETURN OLD;
  END IF;

  -- Extraer el path del storage desde file_url
  -- Manejar diferentes formatos de URL:
  -- 1. Path relativo: user_id/load_id/filename.pdf
  -- 2. URL completa: https://...supabase.co/storage/v1/object/public/load-documents/user_id/load_id/filename.pdf
  
  storage_path := OLD.file_url;
  
  -- Si es una URL completa, extraer solo el path después del bucket
  IF storage_path LIKE '%/storage/v1/object/public/load-documents/%' THEN
    storage_path := SUBSTRING(storage_path FROM '.*/load-documents/(.*)');
  ELSIF storage_path LIKE '%/storage/v1/object/load-documents/%' THEN
    storage_path := SUBSTRING(storage_path FROM '.*/load-documents/(.*)');
  END IF;
  
  -- Validar que tenemos un path válido
  IF storage_path IS NULL OR storage_path = '' OR storage_path = OLD.file_url THEN
    -- Si el path no cambió, significa que ya era relativo
    storage_path := OLD.file_url;
  END IF;
  
  -- Eliminar archivo del storage
  BEGIN
    -- Usar la extensión de storage de Supabase
    PERFORM storage.delete_object(bucket_name, storage_path);
    RAISE NOTICE 'Archivo eliminado exitosamente del storage: bucket=%, path=%', bucket_name, storage_path;
  EXCEPTION WHEN OTHERS THEN
    -- Log el error pero no fallar la operación
    RAISE WARNING 'Error eliminando archivo del storage: bucket=%, path=%, error=%', bucket_name, storage_path, SQLERRM;
  END;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'storage';

-- Recrear el trigger para asegurar que esté activo
DROP TRIGGER IF EXISTS delete_load_document_storage_trigger ON load_documents;
CREATE TRIGGER delete_load_document_storage_trigger
  AFTER DELETE ON load_documents
  FOR EACH ROW
  EXECUTE FUNCTION delete_load_document_storage_file();

-- Actualizar la función de eliminación para ser más explícita sobre el storage
CREATE OR REPLACE FUNCTION delete_load_document_with_validation(document_id_param UUID)
RETURNS jsonb AS $$
DECLARE
  current_user_id UUID;
  doc_record RECORD;
  deletion_result BOOLEAN := false;
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

  -- Delete document (trigger will handle storage cleanup automatically)
  DELETE FROM load_documents WHERE id = document_id_param;
  GET DIAGNOSTICS deletion_result = FOUND;

  IF NOT deletion_result THEN
    RAISE EXCEPTION 'Error: No se pudo eliminar el documento de la base de datos';
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Documento eliminado exitosamente (incluido archivo del storage)',
    'document_id', document_id_param,
    'deleted_by', current_user_id,
    'deleted_at', now(),
    'file_url', doc_record.file_url
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error eliminando documento: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'storage';