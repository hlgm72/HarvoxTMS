-- Fix RLS performance: Optimize auth function calls to prevent re-evaluation per row

-- 1. Fix user_company_roles policies
DROP POLICY IF EXISTS "user_company_roles_select_safe" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_insert_safe" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_update_safe" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_delete_safe" ON public.user_company_roles;

-- Recreate with optimized auth calls
CREATE POLICY "user_company_roles_select_safe"
ON public.user_company_roles
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND (
    user_id = (SELECT auth.uid()) 
    OR user_has_company_access((SELECT auth.uid()), company_id)
  )
);

CREATE POLICY "user_company_roles_insert_safe"
ON public.user_company_roles
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND user_is_company_admin((SELECT auth.uid()), company_id)
);

CREATE POLICY "user_company_roles_update_safe"
ON public.user_company_roles
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND user_is_company_admin((SELECT auth.uid()), company_id)
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND user_is_company_admin((SELECT auth.uid()), company_id)
);

CREATE POLICY "user_company_roles_delete_safe"
ON public.user_company_roles
FOR DELETE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true 
    AND ucr.role = 'superadmin'
  )
);

-- 2. Fix company_client_contacts policies
DROP POLICY IF EXISTS "customer_contacts_select_authorized_only" ON public.company_client_contacts;
DROP POLICY IF EXISTS "customer_contacts_insert_authorized_only" ON public.company_client_contacts;
DROP POLICY IF EXISTS "customer_contacts_update_authorized_only" ON public.company_client_contacts;
DROP POLICY IF EXISTS "customer_contacts_delete_authorized_only" ON public.company_client_contacts;

-- Recreate with optimized auth calls
CREATE POLICY "customer_contacts_select_authorized_only"
ON public.company_client_contacts
FOR SELECT
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);

CREATE POLICY "customer_contacts_insert_authorized_only"
ON public.company_client_contacts
FOR INSERT
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);

CREATE POLICY "customer_contacts_update_authorized_only"
ON public.company_client_contacts
FOR UPDATE
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);

CREATE POLICY "customer_contacts_delete_authorized_only"
ON public.company_client_contacts
FOR DELETE
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND can_access_customer_contacts(client_id)
);

-- 3. Fix load_documents policies
DROP POLICY IF EXISTS "Load documents - company access - SELECT" ON public.load_documents;
DROP POLICY IF EXISTS "Load documents - company access - INSERT" ON public.load_documents;
DROP POLICY IF EXISTS "Load documents - company access - UPDATE" ON public.load_documents;
DROP POLICY IF EXISTS "Load documents - company access - DELETE" ON public.load_documents;

-- Recreate with optimized auth calls
CREATE POLICY "Load documents - company access - SELECT"
ON public.load_documents
FOR SELECT
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND can_access_load(load_id)
);

CREATE POLICY "Load documents - company access - INSERT"
ON public.load_documents
FOR INSERT
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND can_access_load(load_id)
);

CREATE POLICY "Load documents - company access - UPDATE"
ON public.load_documents
FOR UPDATE
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND can_access_load(load_id)
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND can_access_load(load_id)
);

CREATE POLICY "Load documents - company access - DELETE"
ON public.load_documents
FOR DELETE
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND can_access_load(load_id)
);