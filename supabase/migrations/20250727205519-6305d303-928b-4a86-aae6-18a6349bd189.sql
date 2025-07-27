-- Fix storage.objects policies to exclude anonymous users while maintaining functionality

-- Drop existing policies that might allow anonymous access
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Client logos are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Company logo images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Load documents are publicly accessible" ON storage.objects;

-- Create new restrictive policies for public read access (only for specific buckets)
CREATE POLICY "Public read access for avatars" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'avatars'
);

CREATE POLICY "Public read access for company logos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id IN ('company-logos', 'client-logos')
);

-- Update existing authenticated policies to explicitly exclude anonymous users
DROP POLICY IF EXISTS "Authenticated users can delete client logos" ON storage.objects;
CREATE POLICY "Authenticated users can delete client logos" 
ON storage.objects 
FOR DELETE TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  bucket_id = 'client-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT cc.id::text
    FROM company_clients cc
    WHERE cc.company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Authenticated users can update client logos" ON storage.objects;
CREATE POLICY "Authenticated users can update client logos" 
ON storage.objects 
FOR UPDATE TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  bucket_id = 'client-logos' AND
  (storage.foldername(name))[1] IN (
    SELECT cc.id::text
    FROM company_clients cc
    WHERE cc.company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);