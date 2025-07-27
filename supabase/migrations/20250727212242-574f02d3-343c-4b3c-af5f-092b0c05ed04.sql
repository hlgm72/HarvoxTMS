-- Consolidate multiple permissive policies to improve performance

-- 1. FIX COMPANIES TABLE POLICIES
-- Drop the overlapping "Superadmins can access all companies" policy
DROP POLICY IF EXISTS "Superadmins can access all companies" ON public.companies;

-- Drop existing specific policies to recreate consolidated ones
DROP POLICY IF EXISTS "Users can access their companies" ON public.companies;
DROP POLICY IF EXISTS "Company owners can update their companies" ON public.companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;

-- Create consolidated SELECT policy (combines user access + superadmin access)
CREATE POLICY "Consolidated companies select policy" 
ON public.companies 
FOR SELECT TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  (
    -- Regular users can access their companies
    id IN (
      SELECT company_id FROM get_user_admin_companies((select auth.uid()))
      UNION
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
    )
    OR
    -- Superadmins can access all companies
    is_superadmin((select auth.uid()))
  )
);

-- Create consolidated INSERT policy (combines authenticated users + superadmins)
CREATE POLICY "Consolidated companies insert policy" 
ON public.companies 
FOR INSERT TO authenticated
WITH CHECK (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE
);

-- Create consolidated UPDATE policy (combines company owners + superadmins)
CREATE POLICY "Consolidated companies update policy" 
ON public.companies 
FOR UPDATE TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  (
    -- Company owners can update their companies
    user_is_admin_in_company((select auth.uid()), id)
    OR
    -- Superadmins can update all companies
    is_superadmin((select auth.uid()))
  )
)
WITH CHECK (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  (
    -- Company owners can update their companies
    user_is_admin_in_company((select auth.uid()), id)
    OR
    -- Superadmins can update all companies
    is_superadmin((select auth.uid()))
  )
);

-- Create DELETE policy for superadmins only
CREATE POLICY "Consolidated companies delete policy" 
ON public.companies 
FOR DELETE TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  is_superadmin((select auth.uid()))
);

-- 2. FIX USER_COMPANY_ROLES TABLE POLICIES
-- Drop existing overlapping policies
DROP POLICY IF EXISTS "Company owners can manage roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Users can insert their own roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Admins can view company roles" ON public.user_company_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_company_roles;

-- Create consolidated SELECT policy
CREATE POLICY "Consolidated user_company_roles select policy" 
ON public.user_company_roles 
FOR SELECT TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  (
    -- Users can view their own roles
    user_id = (select auth.uid())
    OR
    -- Company owners/admins can view roles in their companies
    company_id IN (
      SELECT ucr.company_id 
      FROM user_company_roles ucr 
      WHERE ucr.user_id = (select auth.uid()) 
      AND ucr.is_active = true 
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
    OR
    -- Superadmins can view all roles
    is_superadmin((select auth.uid()))
  )
);

-- Create consolidated INSERT policy
CREATE POLICY "Consolidated user_company_roles insert policy" 
ON public.user_company_roles 
FOR INSERT TO authenticated
WITH CHECK (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  (
    -- Users can insert their own roles (for self-registration)
    user_id = (select auth.uid())
    OR
    -- Company owners can manage roles in their companies
    company_id IN (
      SELECT ucr.company_id 
      FROM user_company_roles ucr 
      WHERE ucr.user_id = (select auth.uid()) 
      AND ucr.is_active = true 
      AND ucr.role IN ('company_owner', 'superadmin')
    )
    OR
    -- Superadmins can insert any role
    is_superadmin((select auth.uid()))
  )
);

-- Keep existing UPDATE and DELETE policies (no overlaps reported)
-- Just ensure they exist with proper names
DROP POLICY IF EXISTS "Company owners can update roles" ON public.user_company_roles;
CREATE POLICY "Consolidated user_company_roles update policy" 
ON public.user_company_roles 
FOR UPDATE TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  (
    company_id IN (
      SELECT ucr.company_id 
      FROM user_company_roles ucr 
      WHERE ucr.user_id = (select auth.uid()) 
      AND ucr.is_active = true 
      AND ucr.role IN ('company_owner', 'superadmin')
    )
    OR
    is_superadmin((select auth.uid()))
  )
)
WITH CHECK (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  (
    company_id IN (
      SELECT ucr.company_id 
      FROM user_company_roles ucr 
      WHERE ucr.user_id = (select auth.uid()) 
      AND ucr.is_active = true 
      AND ucr.role IN ('company_owner', 'superadmin')
    )
    OR
    is_superadmin((select auth.uid()))
  )
);

DROP POLICY IF EXISTS "Company owners can delete roles" ON public.user_company_roles;
CREATE POLICY "Consolidated user_company_roles delete policy" 
ON public.user_company_roles 
FOR DELETE TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  (
    company_id IN (
      SELECT ucr.company_id 
      FROM user_company_roles ucr 
      WHERE ucr.user_id = (select auth.uid()) 
      AND ucr.is_active = true 
      AND ucr.role IN ('company_owner', 'superadmin')
    )
    OR
    is_superadmin((select auth.uid()))
  )
);