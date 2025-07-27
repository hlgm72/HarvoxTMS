-- Fix infinite recursion in user_company_roles RLS policies
-- Replace recursive policies with SECURITY DEFINER function-based ones

-- Drop the problematic recursive policies
DROP POLICY IF EXISTS "Users can view their company roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Company owners can manage roles" ON public.user_company_roles;

-- Create new non-recursive policies using SECURITY DEFINER functions
CREATE POLICY "Users can view their company roles" 
ON public.user_company_roles 
FOR SELECT 
USING (
  require_authenticated_user() AND 
  ((SELECT auth.uid()) = user_id OR 
   company_id IN (SELECT get_user_admin_companies((SELECT auth.uid()))))
);

CREATE POLICY "Company owners can manage roles" 
ON public.user_company_roles 
FOR ALL 
USING (
  require_authenticated_user() AND 
  (user_is_admin_in_company((SELECT auth.uid()), company_id) OR is_superadmin((SELECT auth.uid())))
)
WITH CHECK (
  require_authenticated_user() AND 
  (user_is_admin_in_company((SELECT auth.uid()), company_id) OR is_superadmin((SELECT auth.uid())))
);