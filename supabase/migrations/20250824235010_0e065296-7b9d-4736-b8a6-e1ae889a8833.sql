-- Fix performance issues: remove duplicate policies and optimize auth function calls

-- =======================
-- 1. Clean up duplicate policies on profiles table
-- =======================
DROP POLICY IF EXISTS "profiles_final" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company only" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- =======================
-- 2. Clean up duplicate policies on owner_operators table
-- =======================
DROP POLICY IF EXISTS "owner_operators_unified_access" ON public.owner_operators;
DROP POLICY IF EXISTS "Owner operators secure company access" ON public.owner_operators;

-- =======================
-- 3. Create optimized policies for profiles (using SELECT for auth functions)
-- =======================
CREATE POLICY "profiles_optimized_select" 
ON public.profiles 
FOR SELECT 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND
  (
    -- Users can see their own profile
    user_id = (SELECT auth.uid()) OR
    -- Users can see profiles of people in their company
    EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = profiles.user_id
      AND ucr2.user_id = (SELECT auth.uid())
      AND ucr1.is_active = true
      AND ucr2.is_active = true
    )
  )
);

CREATE POLICY "profiles_optimized_insert" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND
  user_id = (SELECT auth.uid())
);

CREATE POLICY "profiles_optimized_update" 
ON public.profiles 
FOR UPDATE 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND
  user_id = (SELECT auth.uid())
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND
  user_id = (SELECT auth.uid())
);