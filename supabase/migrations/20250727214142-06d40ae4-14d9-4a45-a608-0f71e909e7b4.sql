-- Clean up multiple permissive policies for profiles and user_company_roles
-- Remove all existing policies and create clean, single policies per action

-- 1. Clean up profiles table policies
DROP POLICY IF EXISTS "Service role profiles access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;

-- Create single, clean policies for profiles
CREATE POLICY "profiles_select_policy" 
ON public.profiles 
FOR SELECT 
USING (
  ((SELECT auth.role()) = 'service_role') OR
  (require_authenticated_user() AND (SELECT auth.uid()) = id)
);

CREATE POLICY "profiles_insert_policy" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  ((SELECT auth.role()) = 'service_role') OR
  (require_authenticated_user() AND (SELECT auth.uid()) = id)
);

CREATE POLICY "profiles_update_policy" 
ON public.profiles 
FOR UPDATE 
USING (
  ((SELECT auth.role()) = 'service_role') OR
  (require_authenticated_user() AND (SELECT auth.uid()) = id)
)
WITH CHECK (
  ((SELECT auth.role()) = 'service_role') OR
  (require_authenticated_user() AND (SELECT auth.uid()) = id)
);

-- 2. Clean up user_company_roles table policies
DROP POLICY IF EXISTS "Company owners can manage roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Service role user company roles access" ON public.user_company_roles;
DROP POLICY IF EXISTS "Users can view their company roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Consolidated user_company_roles delete policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "Consolidated user_company_roles insert policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "Consolidated user_company_roles select policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "Consolidated user_company_roles update policy" ON public.user_company_roles;

-- Create single, clean policies for user_company_roles
CREATE POLICY "user_company_roles_select_policy" 
ON public.user_company_roles 
FOR SELECT 
USING (
  ((SELECT auth.role()) = 'service_role') OR
  (require_authenticated_user() AND 
   ((SELECT auth.uid()) = user_id OR 
    company_id IN (SELECT get_user_admin_companies((SELECT auth.uid())))))
);

CREATE POLICY "user_company_roles_insert_policy" 
ON public.user_company_roles 
FOR INSERT 
WITH CHECK (
  ((SELECT auth.role()) = 'service_role') OR
  (require_authenticated_user() AND 
   (user_is_admin_in_company((SELECT auth.uid()), company_id) OR is_superadmin((SELECT auth.uid()))))
);

CREATE POLICY "user_company_roles_update_policy" 
ON public.user_company_roles 
FOR UPDATE 
USING (
  ((SELECT auth.role()) = 'service_role') OR
  (require_authenticated_user() AND 
   (user_is_admin_in_company((SELECT auth.uid()), company_id) OR is_superadmin((SELECT auth.uid()))))
)
WITH CHECK (
  ((SELECT auth.role()) = 'service_role') OR
  (require_authenticated_user() AND 
   (user_is_admin_in_company((SELECT auth.uid()), company_id) OR is_superadmin((SELECT auth.uid()))))
);

CREATE POLICY "user_company_roles_delete_policy" 
ON public.user_company_roles 
FOR DELETE 
USING (
  ((SELECT auth.role()) = 'service_role') OR
  (require_authenticated_user() AND 
   (user_is_admin_in_company((SELECT auth.uid()), company_id) OR is_superadmin((SELECT auth.uid()))))
);