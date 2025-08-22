-- Drop all existing policies for company-documents bucket
DROP POLICY IF EXISTS "Users can view their company documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their company documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company documents" ON storage.objects;

-- Create highly secure storage policies for company documents
-- Only authenticated company users can view their documents
CREATE POLICY "Authenticated users view company documents" 
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
CREATE POLICY "Authenticated admins upload company documents" 
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
CREATE POLICY "Authenticated admins update company documents" 
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
CREATE POLICY "Authenticated admins delete company documents" 
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