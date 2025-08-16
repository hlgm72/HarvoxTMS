-- Update the profiles UPDATE policy to allow company admins to update profiles of users in their company
DROP POLICY IF EXISTS "profiles_optimized_update" ON public.profiles;

CREATE POLICY "profiles_comprehensive_update" ON public.profiles
  FOR UPDATE 
  TO public
  USING (
    auth.role() = 'authenticated' 
    AND auth.uid() IS NOT NULL 
    AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false 
    AND (
      -- Users can update their own profile
      auth.uid() = user_id 
      OR 
      -- Company admins can update profiles of users in their companies
      user_id IN (
        SELECT ucr1.user_id
        FROM user_company_roles ucr1
        WHERE ucr1.company_id IN (
          SELECT ucr2.company_id
          FROM user_company_roles ucr2
          WHERE ucr2.user_id = auth.uid() 
          AND ucr2.is_active = true 
          AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
        ) 
        AND ucr1.is_active = true
      )
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' 
    AND auth.uid() IS NOT NULL 
    AND COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false 
    AND (
      -- Users can update their own profile
      auth.uid() = user_id 
      OR 
      -- Company admins can update profiles of users in their companies
      user_id IN (
        SELECT ucr1.user_id
        FROM user_company_roles ucr1
        WHERE ucr1.company_id IN (
          SELECT ucr2.company_id
          FROM user_company_roles ucr2
          WHERE ucr2.user_id = auth.uid() 
          AND ucr2.is_active = true 
          AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
        ) 
        AND ucr1.is_active = true
      )
    )
  );