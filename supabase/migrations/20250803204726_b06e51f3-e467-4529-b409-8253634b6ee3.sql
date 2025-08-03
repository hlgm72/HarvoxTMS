-- Fix performance issues in RLS policies
-- 1. Optimize auth function calls with SELECT statements  
-- 2. Consolidate multiple permissive policies into single optimized policies

-- First, drop ALL existing policies on user_company_roles to clean up duplicates
DROP POLICY IF EXISTS "Users can view roles in their companies" ON public.user_company_roles;
DROP POLICY IF EXISTS "Company admins can manage user roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Company users can view all roles in their company" ON public.user_company_roles;

-- Drop ALL existing policies on profiles to clean up duplicates  
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;

-- Create optimized RLS policies for user_company_roles
-- Use (SELECT auth.uid()) instead of auth.uid() for better performance
CREATE POLICY "user_company_roles_select_policy" 
ON public.user_company_roles 
FOR SELECT 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND company_id = ANY(get_user_company_ids_safe((SELECT auth.uid())))
);

CREATE POLICY "user_company_roles_all_policy" 
ON public.user_company_roles 
FOR ALL 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    is_user_admin_in_company_safe((SELECT auth.uid()), company_id) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    is_user_admin_in_company_safe((SELECT auth.uid()), company_id) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);

-- Create optimized RLS policies for profiles  
-- Single policy per action to avoid multiple permissive policies
CREATE POLICY "profiles_select_policy" 
ON public.profiles 
FOR SELECT 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (id = (SELECT auth.uid()) OR user_id = (SELECT auth.uid()))
);

CREATE POLICY "profiles_update_policy" 
ON public.profiles 
FOR UPDATE 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (id = (SELECT auth.uid()) OR user_id = (SELECT auth.uid()))
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (id = (SELECT auth.uid()) OR user_id = (SELECT auth.uid()))
);

CREATE POLICY "profiles_insert_policy" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (id = (SELECT auth.uid()) OR user_id = (SELECT auth.uid()))
);