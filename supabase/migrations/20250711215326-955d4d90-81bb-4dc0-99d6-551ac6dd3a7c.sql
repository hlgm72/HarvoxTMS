-- Fix infinite recursion in user_company_roles policies
-- First, drop the problematic recursive policy
DROP POLICY IF EXISTS "Company owners can manage company roles" ON public.user_company_roles;

-- Create a security definer function to check if user is company owner
CREATE OR REPLACE FUNCTION public.is_company_owner_in_company(company_id_param uuid)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = company_id_param
    AND role = 'company_owner'
    AND is_active = true
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Now create a non-recursive policy using the function
CREATE POLICY "Company owners can manage roles in their company" 
ON public.user_company_roles
FOR ALL 
TO authenticated
USING (public.is_company_owner_in_company(company_id))
WITH CHECK (public.is_company_owner_in_company(company_id));