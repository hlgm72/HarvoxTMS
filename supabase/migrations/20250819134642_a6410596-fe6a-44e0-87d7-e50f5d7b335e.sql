-- Crear políticas para el bucket load-documents usando created_by para conectar con empresa

-- Política para que usuarios autenticados puedan ver archivos de cargas de su empresa
CREATE POLICY "Users can view load documents from their company" 
ON storage.objects 
FOR SELECT 
TO authenticated 
USING (
  bucket_id = 'load-documents' AND
  name ~ '^[a-fA-F0-9\-]+/.*' AND
  substring(name from '^([a-fA-F0-9\-]+)') IN (
    SELECT l.id::text
    FROM loads l
    JOIN user_company_roles ucr ON l.created_by = ucr.user_id
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

-- Política para que usuarios autenticados puedan subir archivos para cargas de su empresa
CREATE POLICY "Users can upload load documents for their company loads" 
ON storage.objects 
FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'load-documents' AND
  name ~ '^[a-fA-F0-9\-]+/.*' AND
  substring(name from '^([a-fA-F0-9\-]+)') IN (
    SELECT l.id::text
    FROM loads l
    JOIN user_company_roles ucr ON l.created_by = ucr.user_id
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

-- Política para que usuarios autenticados puedan actualizar archivos de cargas de su empresa
CREATE POLICY "Users can update load documents from their company" 
ON storage.objects 
FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'load-documents' AND
  name ~ '^[a-fA-F0-9\-]+/.*' AND
  substring(name from '^([a-fA-F0-9\-]+)') IN (
    SELECT l.id::text
    FROM loads l
    JOIN user_company_roles ucr ON l.created_by = ucr.user_id
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

-- Política para que usuarios autenticados puedan eliminar archivos de cargas de su empresa  
CREATE POLICY "Users can delete load documents from their company" 
ON storage.objects 
FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'load-documents' AND
  name ~ '^[a-fA-F0-9\-]+/.*' AND
  substring(name from '^([a-fA-F0-9\-]+)') IN (
    SELECT l.id::text
    FROM loads l
    JOIN user_company_roles ucr ON l.created_by = ucr.user_id
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);