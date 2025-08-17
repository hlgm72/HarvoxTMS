-- Drop existing RLS policy and create more restrictive ones
DROP POLICY IF EXISTS "driver_profiles_final" ON public.driver_profiles;

-- Create separate policies for different access levels
CREATE POLICY "driver_profiles_own_access"
ON public.driver_profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Highly restrictive policy for company admin access (SELECT only)
CREATE POLICY "driver_profiles_admin_access"
ON public.driver_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_driver_sensitive_data(user_id)
);

-- Prevent unauthorized updates by company admins (only owners/superadmins)
CREATE POLICY "driver_profiles_admin_update_restricted"
ON public.driver_profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr1
    JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
    WHERE ucr1.user_id = driver_profiles.user_id
    AND ucr1.is_active = true
    AND ucr2.user_id = auth.uid()
    AND ucr2.is_active = true
    AND ucr2.role IN ('company_owner', 'superadmin')
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr1
    JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
    WHERE ucr1.user_id = driver_profiles.user_id
    AND ucr1.is_active = true
    AND ucr2.user_id = auth.uid()
    AND ucr2.is_active = true
    AND ucr2.role IN ('company_owner', 'superadmin')
  )
);

-- Create policy for inserts (company admins can create driver profiles)
CREATE POLICY "driver_profiles_admin_insert_restricted"
ON public.driver_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = driver_profiles.user_id
      AND ucr1.is_active = true
      AND ucr2.user_id = auth.uid()
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'superadmin')
    )
  )
);