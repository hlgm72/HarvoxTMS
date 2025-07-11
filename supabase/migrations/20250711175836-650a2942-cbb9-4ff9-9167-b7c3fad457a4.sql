-- Fix Multiple Permissive Policies warnings
-- Consolidate multiple policies into single comprehensive policies

-- 1. Fix profiles table - consolidate the two existing policies
DROP POLICY IF EXISTS "Profiles access" ON public.profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON public.profiles;

CREATE POLICY "Profiles comprehensive access" ON public.profiles
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Users can access their own profile
  (auth.role() = 'authenticated' AND auth.uid() = user_id)
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Users can manage their own profile
  (auth.role() = 'authenticated' AND auth.uid() = user_id)
);

-- 2. Fix state_cities table - consolidate the two existing policies
DROP POLICY IF EXISTS "Everyone can read cities" ON public.state_cities;
DROP POLICY IF EXISTS "Service role can manage cities" ON public.state_cities;

CREATE POLICY "State cities comprehensive access" ON public.state_cities
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Everyone can read cities (including anonymous users for public forms)
  true
)
WITH CHECK (
  -- Only service role can manage cities
  auth.role() = 'service_role'
);

-- Log the consolidation
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_multiple_permissive_policies_fixed', jsonb_build_object(
  'timestamp', now(),
  'description', 'Fixed Multiple Permissive Policies warnings by consolidating policies',
  'tables_fixed', ARRAY['profiles', 'state_cities'],
  'approach', 'single_comprehensive_policy_per_table'
));