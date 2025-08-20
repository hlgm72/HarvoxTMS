-- Modificar políticas existentes de storage.objects usando ALTER POLICY
-- Esto debería funcionar sin necesidad de ser propietario de la tabla

-- 1. Modificar política de visualización para excluir usuarios anónimos
ALTER POLICY "Users can view load documents from their company" ON storage.objects
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND bucket_id = 'load-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text 
    FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 2. Modificar política de actualización para excluir usuarios anónimos  
ALTER POLICY "Users can update their load documents" ON storage.objects
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND bucket_id = 'load-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text 
    FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 3. Modificar política de eliminación para excluir usuarios anónimos
ALTER POLICY "Users can delete their load documents" ON storage.objects
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND bucket_id = 'load-documents'
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text 
    FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);