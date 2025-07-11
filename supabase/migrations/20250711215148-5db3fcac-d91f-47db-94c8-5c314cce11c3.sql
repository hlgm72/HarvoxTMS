-- Fix user_company_roles RLS policies to prevent 406 errors
-- Drop existing problematic policies
DROP POLICY IF EXISTS "User company roles safe policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "Service role user company roles access" ON public.user_company_roles;

-- Create simpler, more reliable policies
CREATE POLICY "Users can view their own roles" 
ON public.user_company_roles
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roles" 
ON public.user_company_roles
FOR INSERT 
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own roles" 
ON public.user_company_roles
FOR UPDATE 
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Company owners can manage roles within their company
CREATE POLICY "Company owners can manage company roles" 
ON public.user_company_roles
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.company_id = user_company_roles.company_id
    AND ucr.role = 'company_owner' 
    AND ucr.is_active = true
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.company_id = user_company_roles.company_id
    AND ucr.role = 'company_owner' 
    AND ucr.is_active = true
  )
);

-- Service role policy (bypasses RLS)
CREATE POLICY "Service role can manage all user company roles" 
ON public.user_company_roles
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);