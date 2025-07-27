-- Fix auth_allow_anonymous_sign_ins warnings by restricting policies to authenticated users only
-- This addresses security warnings about RLS policies allowing anonymous access

-- First, ensure helper functions properly check for authenticated non-anonymous users
CREATE OR REPLACE FUNCTION public.require_authenticated_user()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN auth.role() = 'authenticated' AND auth.uid() IS NOT NULL AND 
         (auth.jwt()->>'is_anonymous')::boolean IS FALSE THEN true
    ELSE false
  END;
$$;

-- Fix user_company_roles policies - apply to authenticated role only
DROP POLICY IF EXISTS "Consolidated user_company_roles delete policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "Consolidated user_company_roles insert policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "Consolidated user_company_roles select policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "Consolidated user_company_roles update policy" ON public.user_company_roles;

-- Recreate policies for authenticated users only
CREATE POLICY "Consolidated user_company_roles select policy" 
ON public.user_company_roles 
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND 
  (
    (SELECT auth.uid()) = user_id OR 
    company_id IN (SELECT get_user_admin_companies((SELECT auth.uid()))) OR 
    is_superadmin((SELECT auth.uid()))
  )
);

CREATE POLICY "Consolidated user_company_roles insert policy" 
ON public.user_company_roles 
FOR INSERT 
TO authenticated
WITH CHECK (
  require_authenticated_user() AND 
  (
    user_is_admin_in_company((SELECT auth.uid()), company_id) OR 
    is_superadmin((SELECT auth.uid()))
  )
);

CREATE POLICY "Consolidated user_company_roles update policy" 
ON public.user_company_roles 
FOR UPDATE 
TO authenticated
USING (
  require_authenticated_user() AND 
  (
    user_is_admin_in_company((SELECT auth.uid()), company_id) OR 
    is_superadmin((SELECT auth.uid()))
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  (
    user_is_admin_in_company((SELECT auth.uid()), company_id) OR 
    is_superadmin((SELECT auth.uid()))
  )
);

CREATE POLICY "Consolidated user_company_roles delete policy" 
ON public.user_company_roles 
FOR DELETE 
TO authenticated
USING (
  require_authenticated_user() AND 
  (
    user_is_admin_in_company((SELECT auth.uid()), company_id) OR 
    is_superadmin((SELECT auth.uid()))
  )
);

-- Fix profiles table policy
DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.profiles;

CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (require_authenticated_user() AND (SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (require_authenticated_user() AND (SELECT auth.uid()) = user_id)
WITH CHECK (require_authenticated_user() AND (SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
TO authenticated
WITH CHECK (require_authenticated_user() AND (SELECT auth.uid()) = user_id);

-- Fix storage.objects policies - restrict to authenticated users only
DROP POLICY IF EXISTS "Company members can delete their documents" ON storage.objects;
DROP POLICY IF EXISTS "Company members can update their documents" ON storage.objects;
DROP POLICY IF EXISTS "Company users can delete their company logo" ON storage.objects;
DROP POLICY IF EXISTS "Company users can update their company logo" ON storage.objects;
DROP POLICY IF EXISTS "Equipment documents are viewable by company members" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete equipment documents for their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete load documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete load documents for accessible loads" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update equipment documents for their company" ON storage.objects;
DROP POLICY IF EXISTS "Users can update load documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can update load documents for accessible loads" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can view load documents they have access to" ON storage.objects;

-- Recreate storage policies for authenticated users only
CREATE POLICY "Authenticated users can view documents" 
ON storage.objects 
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND
  (
    -- Avatar access
    (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text) OR
    -- Company logo access
    (bucket_id = 'company-logos' AND EXISTS (
      SELECT 1 FROM user_company_roles ucr 
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )) OR
    -- Document access for company members
    (bucket_id IN ('company-documents', 'equipment-documents', 'load-documents') AND EXISTS (
      SELECT 1 FROM user_company_roles ucr 
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    ))
  )
);

CREATE POLICY "Authenticated users can insert documents" 
ON storage.objects 
FOR INSERT 
TO authenticated
WITH CHECK (
  require_authenticated_user() AND
  (
    -- User can upload their own avatar
    (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text) OR
    -- Company members can upload company documents
    (bucket_id IN ('company-logos', 'company-documents', 'equipment-documents', 'load-documents') AND EXISTS (
      SELECT 1 FROM user_company_roles ucr 
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    ))
  )
);

CREATE POLICY "Authenticated users can update documents" 
ON storage.objects 
FOR UPDATE 
TO authenticated
USING (
  require_authenticated_user() AND
  (
    -- User can update their own avatar
    (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text) OR
    -- Company members can update company documents
    (bucket_id IN ('company-logos', 'company-documents', 'equipment-documents', 'load-documents') AND EXISTS (
      SELECT 1 FROM user_company_roles ucr 
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    ))
  )
)
WITH CHECK (
  require_authenticated_user() AND
  (
    -- User can update their own avatar
    (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text) OR
    -- Company members can update company documents
    (bucket_id IN ('company-logos', 'company-documents', 'equipment-documents', 'load-documents') AND EXISTS (
      SELECT 1 FROM user_company_roles ucr 
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    ))
  )
);

CREATE POLICY "Authenticated users can delete documents" 
ON storage.objects 
FOR DELETE 
TO authenticated
USING (
  require_authenticated_user() AND
  (
    -- User can delete their own avatar
    (bucket_id = 'avatars' AND (storage.foldername(name))[1] = (SELECT auth.uid())::text) OR
    -- Company admins can delete company documents
    (bucket_id IN ('company-logos', 'company-documents', 'equipment-documents', 'load-documents') AND EXISTS (
      SELECT 1 FROM user_company_roles ucr 
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true 
      AND ucr.role IN ('company_owner', 'operations_manager')
    ))
  )
);