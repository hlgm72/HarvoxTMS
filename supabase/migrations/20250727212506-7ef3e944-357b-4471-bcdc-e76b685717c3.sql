-- Fix infinite recursion in user_company_roles consolidated policies
-- Drop existing consolidated policies
DROP POLICY IF EXISTS "Consolidated user_company_roles delete policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "Consolidated user_company_roles insert policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "Consolidated user_company_roles select policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "Consolidated user_company_roles update policy" ON public.user_company_roles;

-- Create new consolidated policies using SECURITY DEFINER functions to avoid recursion
CREATE POLICY "Consolidated user_company_roles select policy" 
ON public.user_company_roles 
FOR SELECT 
USING (
  require_authenticated_user() AND 
  (
    auth.uid() = user_id OR 
    company_id IN (SELECT get_user_admin_companies(auth.uid())) OR 
    is_superadmin(auth.uid())
  )
);

CREATE POLICY "Consolidated user_company_roles insert policy" 
ON public.user_company_roles 
FOR INSERT 
WITH CHECK (
  require_authenticated_user() AND 
  (
    user_is_admin_in_company(auth.uid(), company_id) OR 
    is_superadmin(auth.uid())
  )
);

CREATE POLICY "Consolidated user_company_roles update policy" 
ON public.user_company_roles 
FOR UPDATE 
USING (
  require_authenticated_user() AND 
  (
    user_is_admin_in_company(auth.uid(), company_id) OR 
    is_superadmin(auth.uid())
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  (
    user_is_admin_in_company(auth.uid(), company_id) OR 
    is_superadmin(auth.uid())
  )
);

CREATE POLICY "Consolidated user_company_roles delete policy" 
ON public.user_company_roles 
FOR DELETE 
USING (
  require_authenticated_user() AND 
  (
    user_is_admin_in_company(auth.uid(), company_id) OR 
    is_superadmin(auth.uid())
  )
);