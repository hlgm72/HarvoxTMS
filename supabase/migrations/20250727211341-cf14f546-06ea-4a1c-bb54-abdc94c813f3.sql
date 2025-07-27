-- Fix RLS policies that are blocking legitimate user access

-- Check and fix profiles table policy
DROP POLICY IF EXISTS "Users can view and update their own profile" ON public.profiles;
CREATE POLICY "Users can view and update their own profile" 
ON public.profiles 
FOR ALL TO authenticated
USING ((select auth.uid()) = user_id)
WITH CHECK ((select auth.uid()) = user_id);

-- Check and fix user_company_roles policies to ensure proper access
DROP POLICY IF EXISTS "Users can view their company roles" ON public.user_company_roles;
CREATE POLICY "Users can view their company roles" 
ON public.user_company_roles 
FOR SELECT TO authenticated
USING (
  (select auth.uid()) = user_id OR 
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (select auth.uid()) 
    AND is_active = true 
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- Ensure company owners can manage roles
DROP POLICY IF EXISTS "Company owners can manage roles" ON public.user_company_roles;
CREATE POLICY "Company owners can manage roles" 
ON public.user_company_roles 
FOR ALL TO authenticated
USING (
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (select auth.uid()) 
    AND is_active = true 
    AND role IN ('company_owner', 'superadmin')
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (select auth.uid()) 
    AND is_active = true 
    AND role IN ('company_owner', 'superadmin')
  )
);