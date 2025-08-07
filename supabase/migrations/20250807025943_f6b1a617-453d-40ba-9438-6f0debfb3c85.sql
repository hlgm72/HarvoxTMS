-- Create load-documents storage bucket and RLS policies

-- Create the load-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('load-documents', 'load-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for load-documents bucket

-- Policy for users to view their own load documents
CREATE POLICY "Users can view load documents from their company" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'load-documents' AND
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT l.id::text 
    FROM loads l
    JOIN user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by = ucr.user_id OR
      l.payment_period_id IN (
        SELECT cpp.id FROM company_payment_periods cpp
        WHERE cpp.company_id = ucr.company_id
      )
    )
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

-- Policy for users to upload load documents
CREATE POLICY "Users can upload load documents for their loads" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'load-documents' AND
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT l.id::text 
    FROM loads l
    JOIN user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by = ucr.user_id OR
      l.payment_period_id IN (
        SELECT cpp.id FROM company_payment_periods cpp
        WHERE cpp.company_id = ucr.company_id
      )
    )
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

-- Policy for users to update load documents
CREATE POLICY "Users can update load documents for their loads" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'load-documents' AND
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT l.id::text 
    FROM loads l
    JOIN user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by = ucr.user_id OR
      l.payment_period_id IN (
        SELECT cpp.id FROM company_payment_periods cpp
        WHERE cpp.company_id = ucr.company_id
      )
    )
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
)
WITH CHECK (
  bucket_id = 'load-documents' AND
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
);

-- Policy for users to delete load documents
CREATE POLICY "Users can delete load documents for their loads" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'load-documents' AND
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  (storage.foldername(name))[1]::uuid IN (
    SELECT l.id::text 
    FROM loads l
    JOIN user_company_roles ucr ON (
      l.driver_user_id = ucr.user_id OR 
      l.created_by = ucr.user_id OR
      l.payment_period_id IN (
        SELECT cpp.id FROM company_payment_periods cpp
        WHERE cpp.company_id = ucr.company_id
      )
    )
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);