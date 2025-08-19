-- Fix storage RLS policies for load-documents bucket

-- First, ensure the bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('load-documents', 'load-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload load documents to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can view load documents from their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their load documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their load documents" ON storage.objects;

-- Create RLS policies for load-documents bucket
CREATE POLICY "Users can upload load documents to their own folder"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'load-documents' 
  AND (select auth.uid()) IS NOT NULL
  AND (storage.foldername(name))[1] = (select auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.is_active = true
  )
);

CREATE POLICY "Users can view load documents from their company"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'load-documents'
  AND (select auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr1
    JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
    WHERE ucr1.user_id = (select auth.uid())
    AND ucr2.user_id = ((storage.foldername(name))[1])::uuid
    AND ucr1.is_active = true
    AND ucr2.is_active = true
  )
);

CREATE POLICY "Users can update their load documents"
ON storage.objects
FOR UPDATE
USING (
  bucket_id = 'load-documents'
  AND (select auth.uid()) IS NOT NULL
  AND (storage.foldername(name))[1] = (select auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.is_active = true
  )
);

CREATE POLICY "Users can delete their load documents"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'load-documents'
  AND (select auth.uid()) IS NOT NULL
  AND (storage.foldername(name))[1] = (select auth.uid())::text
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.is_active = true
  )
);