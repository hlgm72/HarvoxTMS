-- Fix the storage policies for load documents to allow proper company access
-- Drop the overly restrictive policies
DROP POLICY IF EXISTS "Users can view load documents from their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload load documents for their company loads" ON storage.objects;
DROP POLICY IF EXISTS "Users can update load documents from their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete load documents from their company" ON storage.objects;

-- Create new policies that allow proper access for dispatchers and owner operators
CREATE POLICY "Load documents - SELECT access"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'load-documents' 
  AND name ~ '^[a-fA-F0-9\-]+/.*'
  AND can_access_load(substring(name, '^([a-fA-F0-9\-]+)')::uuid)
);

CREATE POLICY "Load documents - INSERT access"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'load-documents' 
  AND name ~ '^[a-fA-F0-9\-]+/.*'
  AND can_access_load(substring(name, '^([a-fA-F0-9\-]+)')::uuid)
);

CREATE POLICY "Load documents - UPDATE access"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'load-documents' 
  AND name ~ '^[a-fA-F0-9\-]+/.*'
  AND can_access_load(substring(name, '^([a-fA-F0-9\-]+)')::uuid)
)
WITH CHECK (
  bucket_id = 'load-documents' 
  AND name ~ '^[a-fA-F0-9\-]+/.*'
  AND can_access_load(substring(name, '^([a-fA-F0-9\-]+)')::uuid)
);

CREATE POLICY "Load documents - DELETE access"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'load-documents' 
  AND name ~ '^[a-fA-F0-9\-]+/.*'
  AND can_access_load(substring(name, '^([a-fA-F0-9\-]+)')::uuid)
);