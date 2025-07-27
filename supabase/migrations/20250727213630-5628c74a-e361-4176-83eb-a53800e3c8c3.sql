-- Fix auth_allow_anonymous_sign_ins warnings for profiles and user_company_roles
-- Remove problematic policies and recreate clean ones

-- 1. Fix public.profiles table
-- Drop all existing policies
DROP POLICY IF EXISTS "Profiles user access" ON public.profiles;
DROP POLICY IF EXISTS "Service role profiles access" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;

-- Create clean, restrictive policies for profiles
CREATE POLICY "Users can view own profile" 
ON public.profiles 
FOR SELECT 
USING (require_authenticated_user() AND (SELECT auth.uid()) = id);

CREATE POLICY "Users can update own profile" 
ON public.profiles 
FOR UPDATE 
USING (require_authenticated_user() AND (SELECT auth.uid()) = id)
WITH CHECK (require_authenticated_user() AND (SELECT auth.uid()) = id);

CREATE POLICY "Users can insert own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (require_authenticated_user() AND (SELECT auth.uid()) = id);

-- Service role access (needed for system operations)
CREATE POLICY "Service role profiles access" 
ON public.profiles 
FOR ALL 
USING ((SELECT auth.role()) = 'service_role');

-- 2. Fix public.user_company_roles table  
-- Drop all existing policies except the main ones we need
DROP POLICY IF EXISTS "Users can view their company roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Company owners can manage roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Service role user company roles access" ON public.user_company_roles;

-- Create clean, restrictive policies for user_company_roles
CREATE POLICY "Users can view their company roles" 
ON public.user_company_roles 
FOR SELECT 
USING (
  require_authenticated_user() AND 
  ((SELECT auth.uid()) = user_id OR 
   user_id IN (
     SELECT ucr.user_id 
     FROM user_company_roles ucr 
     WHERE ucr.company_id IN (
       SELECT ucr2.company_id 
       FROM user_company_roles ucr2 
       WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
     ) AND ucr.is_active = true
   ))
);

CREATE POLICY "Company owners can manage roles" 
ON public.user_company_roles 
FOR ALL 
USING (
  require_authenticated_user() AND 
  (company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.role IN ('company_owner', 'superadmin') 
    AND ucr.is_active = true
  ))
)
WITH CHECK (
  require_authenticated_user() AND 
  (company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.role IN ('company_owner', 'superadmin') 
    AND ucr.is_active = true
  ))
);

-- Service role access (needed for system operations)
CREATE POLICY "Service role user company roles access" 
ON public.user_company_roles 
FOR ALL 
USING ((SELECT auth.role()) = 'service_role');

-- Verify RLS is enabled on both tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_company_roles ENABLE ROW LEVEL SECURITY;