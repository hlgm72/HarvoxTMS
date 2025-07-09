-- Create security definer function to get user role without recursion
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.user_company_roles 
  WHERE user_id = auth.uid() AND is_active = true 
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Company owners can manage company roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Users can view their own company roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Service role can manage user company roles" ON public.user_company_roles;

-- Create simple, non-recursive policies
CREATE POLICY "Users can view their own company roles" 
ON public.user_company_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own company roles" 
ON public.user_company_roles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own company roles" 
ON public.user_company_roles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

-- Service role policy (bypasses RLS)
CREATE POLICY "Service role can manage user company roles" 
ON public.user_company_roles
FOR ALL TO service_role
USING (true)
WITH CHECK (true);