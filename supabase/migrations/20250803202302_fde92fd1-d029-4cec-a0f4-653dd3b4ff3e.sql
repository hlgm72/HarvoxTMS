-- Fix RLS policy for profiles table to allow company admins to see all company user profiles
DROP POLICY IF EXISTS "Driver profiles company access" ON public.profiles;

CREATE POLICY "Company users can view profiles" 
ON public.profiles 
FOR SELECT 
USING (
  (auth.uid() IS NOT NULL) AND 
  ((auth.jwt()->>'is_anonymous')::boolean IS FALSE) AND 
  (
    -- User can see their own profile
    auth.uid() = user_id OR 
    -- Or user can see profiles of users in the same company if they have admin privileges
    (
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
    -- Or if user is in same company (for basic visibility)
    OR (
      user_id IN (
        SELECT ucr1.user_id
        FROM user_company_roles ucr1
        WHERE ucr1.company_id IN (
          SELECT ucr2.company_id
          FROM user_company_roles ucr2
          WHERE ucr2.user_id = auth.uid() 
          AND ucr2.is_active = true
        )
        AND ucr1.is_active = true
      )
    )
  )
);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Company admins can insert profiles" 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  (auth.uid() IS NOT NULL) AND 
  ((auth.jwt()->>'is_anonymous')::boolean IS FALSE) AND
  (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
    )
  )
);