-- Fix storage.objects anonymous access warnings while maintaining necessary functionality

-- Drop the public read policies that allow anonymous access
DROP POLICY IF EXISTS "Public read access for avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public read access for company logos" ON storage.objects;

-- Create new policies that allow read access but exclude anonymous users
CREATE POLICY "Authenticated read access for avatars" 
ON storage.objects 
FOR SELECT TO authenticated
USING (
  bucket_id = 'avatars' AND
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE
);

CREATE POLICY "Authenticated read access for company logos" 
ON storage.objects 
FOR SELECT TO authenticated
USING (
  bucket_id IN ('company-logos', 'client-logos') AND
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE
);

-- Update remaining storage policies to explicitly exclude anonymous users
-- These policies likely exist but need to be optimized for performance and security

-- Company documents policy optimization
DROP POLICY IF EXISTS "Company documents accessible to company members" ON storage.objects;
CREATE POLICY "Company documents accessible to company members" 
ON storage.objects 
FOR SELECT TO authenticated
USING (
  bucket_id = 'company-documents' AND
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  (storage.foldername(name))[1] IN (
    SELECT c.id::text
    FROM companies c
    WHERE c.id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
    )
  )
);