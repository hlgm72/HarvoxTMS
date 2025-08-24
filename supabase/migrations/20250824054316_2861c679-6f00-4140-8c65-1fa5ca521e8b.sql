-- Add missing SELECT policy for driver_profiles table
CREATE POLICY "driver_profiles_select_own_and_company" ON driver_profiles
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL 
    AND NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false)
    AND (
      user_id = auth.uid() -- Users can view their own profile
      OR EXISTS (
        SELECT 1 FROM user_company_roles ucr1
        JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
        WHERE ucr1.user_id = driver_profiles.user_id
          AND ucr1.is_active = true
          AND ucr2.user_id = auth.uid()
          AND ucr2.is_active = true
          AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
      )
    )
  );