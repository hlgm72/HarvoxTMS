-- Fix storage policies to allow only authenticated users (no anonymous access)

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their company documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to their company folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their company documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their company documents" ON storage.objects;

-- Create secure storage policies for company documents (authenticated users only, no anonymous)
-- Users can view their own company's documents (authenticated only)
CREATE POLICY "Authenticated users can view company documents" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'company-documents' 
  AND auth.uid() IS NOT NULL
  AND auth.role() = 'authenticated'
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text 
    FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Users can upload documents to their company folder (authenticated admins only)
CREATE POLICY "Authenticated admins can upload company documents" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  bucket_id = 'company-documents' 
  AND auth.uid() IS NOT NULL
  AND auth.role() = 'authenticated'
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- Users can update their company documents (authenticated admins only)
CREATE POLICY "Authenticated admins can update company documents" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  bucket_id = 'company-documents' 
  AND auth.uid() IS NOT NULL
  AND auth.role() = 'authenticated'
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- Users can delete their company documents (authenticated admins only)
CREATE POLICY "Authenticated admins can delete company documents" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  bucket_id = 'company-documents' 
  AND auth.uid() IS NOT NULL
  AND auth.role() = 'authenticated'
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (storage.foldername(name))[1] IN (
    SELECT company_id::text 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);