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
  IF storage_path IS NULL OR storage_path = '' THEN
    RAISE WARNING 'No se pudo extraer un path válido del file_url: %', OLD.file_url;
    RETURN OLD;
  END IF;
  
  -- Eliminar archivo del storage usando la función correcta
  BEGIN
    -- Usar la función correcta de storage con los parámetros adecuados
    DELETE FROM storage.objects 
    WHERE bucket_id = bucket_name AND name = storage_path;
    
    RAISE NOTICE 'Archivo eliminado exitosamente del storage: bucket=%, path=%', bucket_name, storage_path;
  EXCEPTION WHEN OTHERS THEN
    -- Log el error pero no fallar la operación
    RAISE WARNING 'Error eliminando archivo del storage: bucket=%, path=%, error=%', bucket_name, storage_path, SQLERRM;
  END;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'storage';

-- También actualizar la función para company documents
CREATE OR REPLACE FUNCTION delete_company_document_storage_file()
RETURNS TRIGGER AS $$
DECLARE
  storage_path TEXT;
  bucket_name TEXT := 'company-documents';
BEGIN
  -- Solo proceder si tenemos un file_url
  IF OLD.file_url IS NULL OR OLD.file_url = '' THEN
    RAISE NOTICE 'No hay file_url para eliminar del storage';
    RETURN OLD;
  END IF;

  -- Extraer el path del storage desde file_url
  storage_path := OLD.file_url;
  
  -- Si es una URL completa, extraer solo el path después del bucket
  IF storage_path LIKE '%/storage/v1/object/public/company-documents/%' THEN
    storage_path := SUBSTRING(storage_path FROM '.*/company-documents/(.*)');
  ELSIF storage_path LIKE '%/storage/v1/object/company-documents/%' THEN
    storage_path := SUBSTRING(storage_path FROM '.*/company-documents/(.*)');
  END IF;
  
  -- Validar que tenemos un path válido
  IF storage_path IS NULL OR storage_path = '' THEN
    RAISE WARNING 'No se pudo extraer un path válido del file_url: %', OLD.file_url;
    RETURN OLD;
  END IF;
  
  -- Eliminar archivo del storage
  BEGIN
    DELETE FROM storage.objects 
    WHERE bucket_id = bucket_name AND name = storage_path;
    
    RAISE NOTICE 'Archivo eliminado exitosamente del storage: bucket=%, path=%', bucket_name, storage_path;
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Error eliminando archivo del storage: bucket=%, path=%, error=%', bucket_name, storage_path, SQLERRM;
  END;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public', 'storage';