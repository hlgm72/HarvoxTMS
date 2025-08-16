-- Optimize RLS policies to prevent auth function re-evaluation per row

-- Fix user_company_roles policy
DROP POLICY IF EXISTS "user_company_roles_comprehensive_access" ON public.user_company_roles;

CREATE POLICY "user_company_roles_comprehensive_access" ON public.user_company_roles
  FOR ALL 
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
    AND check_user_role_access(user_id, company_id)
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
    AND (
      -- Users can manage their own roles
      user_id = (SELECT auth.uid()) 
      OR 
      -- Superadmins can manage any role
      check_is_superadmin()
      OR
      -- Company owners and operations managers can assign roles to users in their company
      (
        company_id IN (
          SELECT ucr.company_id 
          FROM user_company_roles ucr 
          WHERE ucr.user_id = (SELECT auth.uid()) 
          AND ucr.is_active = true 
          AND ucr.role IN ('company_owner', 'operations_manager')
        )
      )
    )
  );

-- Fix profiles INSERT policy
DROP POLICY IF EXISTS "profiles_comprehensive_insert" ON public.profiles;

CREATE POLICY "profiles_comprehensive_insert" ON public.profiles
  FOR INSERT 
  TO public
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated' 
    AND (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
    AND (
      -- Users can insert their own profile
      (SELECT auth.uid()) = user_id 
      OR 
      -- Company admins can insert profiles for users in their companies
      user_id IN (
        SELECT ucr1.user_id
        FROM user_company_roles ucr1
        WHERE ucr1.company_id IN (
          SELECT ucr2.company_id
          FROM user_company_roles ucr2
          WHERE ucr2.user_id = (SELECT auth.uid()) 
          AND ucr2.is_active = true 
          AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
        ) 
        AND ucr1.is_active = true
      )
    )
  );

-- Fix profiles UPDATE policy
DROP POLICY IF EXISTS "profiles_comprehensive_update" ON public.profiles;

CREATE POLICY "profiles_comprehensive_update" ON public.profiles
  FOR UPDATE 
  TO public
  USING (
    (SELECT auth.role()) = 'authenticated' 
    AND (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
    AND (
      -- Users can update their own profile
      (SELECT auth.uid()) = user_id 
      OR 
      -- Company admins can update profiles of users in their companies
      user_id IN (
        SELECT ucr1.user_id
        FROM user_company_roles ucr1
        WHERE ucr1.company_id IN (
          SELECT ucr2.company_id
          FROM user_company_roles ucr2
          WHERE ucr2.user_id = (SELECT auth.uid()) 
          AND ucr2.is_active = true 
          AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
        ) 
        AND ucr1.is_active = true
      )
    )
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated' 
    AND (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false 
    AND (
      -- Users can update their own profile
      (SELECT auth.uid()) = user_id 
      OR 
      -- Company admins can update profiles of users in their companies
      user_id IN (
        SELECT ucr1.user_id
        FROM user_company_roles ucr1
        WHERE ucr1.company_id IN (
          SELECT ucr2.company_id
          FROM user_company_roles ucr2
          WHERE ucr2.user_id = (SELECT auth.uid()) 
          AND ucr2.is_active = true 
          AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
        ) 
        AND ucr1.is_active = true
      )
    )
  );