-- Fix companies table policies to allow access to company members

-- Drop existing problematic policies
DROP POLICY IF EXISTS "SuperAdmin complete access" ON public.companies;

-- Create simple policy for users to access their companies
CREATE POLICY "Users can access their companies" 
ON public.companies 
FOR SELECT TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  id IN (
    SELECT company_id FROM get_user_admin_companies((select auth.uid()))
    UNION
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
  )
);

-- Create policy for company owners to update their companies
CREATE POLICY "Company owners can update their companies" 
ON public.companies 
FOR UPDATE TO authenticated
USING (
  user_is_admin_in_company((select auth.uid()), id)
)
WITH CHECK (
  user_is_admin_in_company((select auth.uid()), id)
);

-- Allow superadmins full access
CREATE POLICY "Superadmins can access all companies" 
ON public.companies 
FOR ALL TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  is_superadmin((select auth.uid()))
)
WITH CHECK (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  is_superadmin((select auth.uid()))
);

-- Allow company owners to create companies (for invitations)
CREATE POLICY "Authenticated users can create companies" 
ON public.companies 
FOR INSERT TO authenticated
WITH CHECK (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE
);