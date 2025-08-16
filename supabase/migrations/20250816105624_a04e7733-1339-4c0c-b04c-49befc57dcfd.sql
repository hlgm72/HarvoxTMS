-- Fix the security functions that are being too restrictive

-- First, let's fix the is_user_superadmin_safe function to be less restrictive
CREATE OR REPLACE FUNCTION public.is_user_superadmin_safe(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_company_roles
    WHERE user_id = user_id_param
      AND role = 'superadmin'
      AND is_active = true
  );
$$;

-- Fix the is_user_authorized_for_company function to be less restrictive  
CREATE OR REPLACE FUNCTION public.is_user_authorized_for_company(company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_company_roles
    WHERE user_id = auth.uid()
      AND company_id = company_id_param
      AND is_active = true
  );
$$;

-- Simplify the companies RLS policy to be less restrictive
DROP POLICY IF EXISTS "companies_authenticated_members_only" ON public.companies;

CREATE POLICY "companies_authenticated_members_access" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    -- User is a member of this company
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND company_id = companies.id
      AND is_active = true
    )
    -- OR user is a superadmin
    OR EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = auth.uid()
      AND role = 'superadmin'
      AND is_active = true
    )
  )
);

-- Also temporarily allow broader access to user_company_roles for debugging
DROP POLICY IF EXISTS "user_company_roles_access_policy" ON public.user_company_roles;

CREATE POLICY "user_company_roles_relaxed_access" 
ON public.user_company_roles 
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    -- User can see their own roles
    user_id = auth.uid()
    -- OR user is a superadmin  
    OR EXISTS (
      SELECT 1 FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid()
      AND ucr2.role = 'superadmin'
      AND ucr2.is_active = true
    )
    -- OR user is company admin in same company
    OR EXISTS (
      SELECT 1 FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid()
      AND ucr2.company_id = user_company_roles.company_id
      AND ucr2.role IN ('company_owner', 'operations_manager')
      AND ucr2.is_active = true
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid()
      AND ucr2.role = 'superadmin'
      AND ucr2.is_active = true
    )
  )
);