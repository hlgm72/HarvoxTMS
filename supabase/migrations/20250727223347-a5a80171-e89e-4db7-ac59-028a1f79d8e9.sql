-- Fix Storage RLS Policies to Prevent Anonymous Access

-- Remove any existing policies that might allow anonymous access
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;

-- Create secure storage policies that require authenticated users
-- Avatar bucket policies
CREATE POLICY "Authenticated users can view avatars" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'avatars' AND
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE)
);

CREATE POLICY "Users can upload their own avatar" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'avatars' AND
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND
  (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'avatars' AND
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND
  (SELECT auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND
  (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'avatars' AND
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND
  (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

-- Documents bucket policies  
CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'documents' AND
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND
  (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'documents' AND
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND
  (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'documents' AND
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND
  (SELECT auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'documents' AND
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND
  (SELECT auth.uid())::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own documents" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'documents' AND
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND
  (SELECT auth.uid())::text = (storage.foldername(name))[1]
);