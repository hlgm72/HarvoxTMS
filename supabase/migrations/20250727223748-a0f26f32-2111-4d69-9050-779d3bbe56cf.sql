-- Completely remove all storage policies and create restrictive ones

-- First, drop ALL policies on storage.objects
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', 
                      pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END $$;

-- Create extremely restrictive policies that explicitly deny anonymous users
CREATE POLICY "Strict authenticated avatar access" 
ON storage.objects 
FOR ALL
TO authenticated
USING (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, true) AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' AND
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, true) AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Strict authenticated document access" 
ON storage.objects 
FOR ALL
TO authenticated
USING (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, true) AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'documents' AND
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, true) AND
  auth.uid()::text = (storage.foldername(name))[1]
);