-- First, check which load document policies exist
DO $$
BEGIN
  -- Drop existing restrictive policies if they exist
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can view load documents from their company' AND schemaname = 'storage') THEN
    DROP POLICY "Users can view load documents from their company" ON storage.objects;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can upload load documents for their company loads' AND schemaname = 'storage') THEN
    DROP POLICY "Users can upload load documents for their company loads" ON storage.objects;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can update load documents from their company' AND schemaname = 'storage') THEN
    DROP POLICY "Users can update load documents from their company" ON storage.objects;
  END IF;
  
  IF EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can delete load documents from their company' AND schemaname = 'storage') THEN
    DROP POLICY "Users can delete load documents from their company" ON storage.objects;
  END IF;
END $$;

-- Create new policies that use the correct can_access_load function
CREATE POLICY "Load documents company access - SELECT"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'load-documents' 
  AND name ~ '^[a-fA-F0-9\-]+/.*'
  AND can_access_load(substring(name, '^([a-fA-F0-9\-]+)')::uuid)
);

CREATE POLICY "Load documents company access - INSERT"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'load-documents' 
  AND name ~ '^[a-fA-F0-9\-]+/.*'
  AND can_access_load(substring(name, '^([a-fA-F0-9\-]+)')::uuid)
);

CREATE POLICY "Load documents company access - UPDATE"
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

CREATE POLICY "Load documents company access - DELETE"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'load-documents' 
  AND name ~ '^[a-fA-F0-9\-]+/.*'
  AND can_access_load(substring(name, '^([a-fA-F0-9\-]+)')::uuid)
);