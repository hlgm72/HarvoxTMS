-- Fix anonymous access warning for driver_profiles_own_access policy
-- Replace the policy to properly exclude anonymous users

DROP POLICY IF EXISTS "driver_profiles_own_access" ON public.driver_profiles;

-- Create updated policy that properly excludes anonymous users
CREATE POLICY "driver_profiles_own_access"
ON public.driver_profiles
FOR ALL
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND user_id = auth.uid()
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND user_id = auth.uid()
);