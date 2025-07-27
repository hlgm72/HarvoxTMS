-- Fix Storage Policies to Properly Exclude Anonymous Users

-- Drop ALL existing policies on storage.objects
DROP POLICY IF EXISTS "Authenticated users can view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;

-- Create a security definer function to check if user is authenticated and not anonymous
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND 
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false;
$$;

-- Create secure storage policies using the function
CREATE POLICY "Authenticated users can view avatars" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  bucket_id = 'avatars' AND
  public.is_authenticated_user()
);

CREATE POLICY "Users can manage their own avatar" 
ON storage.objects 
FOR ALL
TO authenticated
USING (
  bucket_id = 'avatars' AND
  public.is_authenticated_user() AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'avatars' AND
  public.is_authenticated_user() AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can manage their own documents" 
ON storage.objects 
FOR ALL
TO authenticated
USING (
  bucket_id = 'documents' AND
  public.is_authenticated_user() AND
  auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'documents' AND
  public.is_authenticated_user() AND
  auth.uid()::text = (storage.foldername(name))[1]
);