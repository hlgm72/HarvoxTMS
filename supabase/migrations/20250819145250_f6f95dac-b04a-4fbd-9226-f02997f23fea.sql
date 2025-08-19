-- Fix the RLS policies to explicitly block anonymous users

-- Drop and recreate user_company_roles policies with explicit anonymous blocking
DROP POLICY IF EXISTS "user_company_roles_select_safe" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_update_safe" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_delete_safe" ON public.user_company_roles;

-- Recreate with explicit authentication and non-anonymous checks
CREATE POLICY "user_company_roles_select_safe"
ON public.user_company_roles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND (
    user_id = auth.uid() 
    OR user_has_company_access(auth.uid(), company_id)
  )
);

CREATE POLICY "user_company_roles_update_safe"
ON public.user_company_roles
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND user_is_company_admin(auth.uid(), company_id)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND user_is_company_admin(auth.uid(), company_id)
);

CREATE POLICY "user_company_roles_delete_safe"
ON public.user_company_roles
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true 
    AND ucr.role = 'superadmin'
  )
);

-- Fix storage policies for load documents
DROP POLICY IF EXISTS "Load documents company access - SELECT" ON storage.objects;
DROP POLICY IF EXISTS "Load documents company access - INSERT" ON storage.objects;
DROP POLICY IF EXISTS "Load documents company access - UPDATE" ON storage.objects;
DROP POLICY IF EXISTS "Load documents company access - DELETE" ON storage.objects;

-- Recreate with explicit authentication checks
CREATE POLICY "Load documents company access - SELECT"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND bucket_id = 'load-documents' 
  AND name ~ '^[a-fA-F0-9\-]+/.*'
  AND can_access_load(substring(name, '^([a-fA-F0-9\-]+)')::uuid)
);

CREATE POLICY "Load documents company access - INSERT"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND bucket_id = 'load-documents' 
  AND name ~ '^[a-fA-F0-9\-]+/.*'
  AND can_access_load(substring(name, '^([a-fA-F0-9\-]+)')::uuid)
);

CREATE POLICY "Load documents company access - UPDATE"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND bucket_id = 'load-documents' 
  AND name ~ '^[a-fA-F0-9\-]+/.*'
  AND can_access_load(substring(name, '^([a-fA-F0-9\-]+)')::uuid)
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND bucket_id = 'load-documents' 
  AND name ~ '^[a-fA-F0-9\-]+/.*'
  AND can_access_load(substring(name, '^([a-fA-F0-9\-]+)')::uuid)
);

CREATE POLICY "Load documents company access - DELETE"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND bucket_id = 'load-documents' 
  AND name ~ '^[a-fA-F0-9\-]+/.*'
  AND can_access_load(substring(name, '^([a-fA-F0-9\-]+)')::uuid)
);