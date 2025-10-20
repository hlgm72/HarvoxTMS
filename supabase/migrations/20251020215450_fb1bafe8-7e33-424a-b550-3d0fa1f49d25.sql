-- Drop existing restrictive policies for profiles
DROP POLICY IF EXISTS "profiles_optimized_insert" ON public.profiles;
DROP POLICY IF EXISTS "profiles_optimized_update" ON public.profiles;

-- Create new INSERT policy allowing company managers to create profiles for their users
CREATE POLICY "profiles_insert_company_managers"
ON public.profiles
FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND (
    -- Users can insert their own profile
    user_id = auth.uid()
    OR
    -- Company managers can insert profiles for users in their company
    user_id IN (
      SELECT ucr1.user_id
      FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr2.user_id = auth.uid()
        AND ucr2.is_active = true
        AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
        AND ucr1.is_active = true
    )
  )
);

-- Create new UPDATE policy allowing company managers to update profiles for their users
CREATE POLICY "profiles_update_company_managers"
ON public.profiles
FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND (
    -- Users can update their own profile
    user_id = auth.uid()
    OR
    -- Company managers can update profiles for users in their company
    user_id IN (
      SELECT ucr1.user_id
      FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr2.user_id = auth.uid()
        AND ucr2.is_active = true
        AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
        AND ucr1.is_active = true
    )
  )
)
WITH CHECK (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND (
    -- Users can update their own profile
    user_id = auth.uid()
    OR
    -- Company managers can update profiles for users in their company
    user_id IN (
      SELECT ucr1.user_id
      FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr2.user_id = auth.uid()
        AND ucr2.is_active = true
        AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
        AND ucr1.is_active = true
    )
  )
);