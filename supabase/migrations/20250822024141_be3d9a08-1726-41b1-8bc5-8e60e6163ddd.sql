-- Drop all existing policies for company-documents bucket with different approach
DROP POLICY IF EXISTS "Authenticated users view company documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated admins upload company documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated admins update company documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated admins delete company documents" ON storage.objects;

-- Create secure storage policies for company documents with unique names
-- Only authenticated company users can view their documents
CREATE POLICY "company_docs_select_policy" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'company-documents' 
  AND auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text 
    FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Only authenticated company admins can upload documents
CREATE POLICY "company_docs_insert_policy" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'company-documents' 
  AND auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- Only authenticated company admins can update documents
CREATE POLICY "company_docs_update_policy" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'company-documents' 
  AND auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- Only authenticated company admins can delete documents
CREATE POLICY "company_docs_delete_policy" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'company-documents' 
  AND auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);