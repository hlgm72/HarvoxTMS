-- Create company documents storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('company-documents', 'company-documents', false);

-- Create storage policies for company documents
-- Users can view their own company's documents
CREATE POLICY "Users can view their company documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'company-documents' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT company_id::text 
    FROM user_company_roles 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Users can upload documents to their company folder
CREATE POLICY "Users can upload to their company folder" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'company-documents' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT company_id::text 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- Users can update their company documents
CREATE POLICY "Users can update their company documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'company-documents' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT company_id::text 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- Users can delete their company documents
CREATE POLICY "Users can delete their company documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'company-documents' 
  AND (storage.foldername(name))[1]::uuid IN (
    SELECT company_id::text 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);