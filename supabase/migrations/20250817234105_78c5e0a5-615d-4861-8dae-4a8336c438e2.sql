-- Create the load-documents storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('load-documents', 'load-documents', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for the load-documents bucket

-- Policy to allow authenticated users to view files in their organization
CREATE POLICY "Users can view files from their company" ON storage.objects
FOR SELECT 
USING (
  bucket_id = 'load-documents' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] IN (
    SELECT ucr.user_id::text FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT company_id FROM user_company_roles 
      WHERE user_id = auth.uid() AND is_active = true
    ) AND ucr.is_active = true
  )
);

-- Policy to allow authenticated users to upload files
CREATE POLICY "Users can upload files for their loads" ON storage.objects
FOR INSERT 
WITH CHECK (
  bucket_id = 'load-documents' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to update files they uploaded
CREATE POLICY "Users can update their own files" ON storage.objects
FOR UPDATE 
USING (
  bucket_id = 'load-documents' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy to allow users to delete files they uploaded
CREATE POLICY "Users can delete their own files" ON storage.objects
FOR DELETE 
USING (
  bucket_id = 'load-documents' AND
  auth.uid() IS NOT NULL AND
  (storage.foldername(name))[1] = auth.uid()::text
);