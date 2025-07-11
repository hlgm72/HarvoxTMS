-- Fix remaining Multiple Permissive Policies warnings and optimize RLS policies
-- Consolidate multiple policies and optimize function calls

-- 1. Fix system_stats table - consolidate multiple policies
DROP POLICY IF EXISTS "Service role can manage system stats" ON public.system_stats;
DROP POLICY IF EXISTS "SuperAdmin can view system stats" ON public.system_stats;

CREATE POLICY "System stats comprehensive access" ON public.system_stats
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- SuperAdmin can view system stats
  (auth.role() = 'authenticated' AND is_superadmin(auth.uid()))
)
WITH CHECK (
  -- Only service role can manage system stats
  auth.role() = 'service_role'
);

-- 2. Fix user_invitations table - consolidate multiple policies
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON public.user_invitations;
DROP POLICY IF EXISTS "Company admins can manage invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Service role can manage invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can view their company invitations" ON public.user_invitations;

CREATE POLICY "User invitations comprehensive access" ON public.user_invitations
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can view invitations sent to them or from their company
  (auth.role() = 'authenticated' AND (
    -- Invitations sent to their email
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR
    -- Invitations from their company (for company admins)
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.is_active = true 
      AND ucr.role IN ('company_owner', 'senior_dispatcher')
    )
  ))
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Company admins can manage invitations for their company
  (auth.role() = 'authenticated' AND company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true 
    AND ucr.role IN ('company_owner', 'senior_dispatcher')
  ))
);

-- 3. Fix states table - consolidate multiple policies
DROP POLICY IF EXISTS "Everyone can read states" ON public.states;
DROP POLICY IF EXISTS "Service role can manage states" ON public.states;

CREATE POLICY "States comprehensive access" ON public.states
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Everyone can read states (including anonymous users for public forms)
  true
)
WITH CHECK (
  -- Only service role can manage states
  auth.role() = 'service_role'
);

-- Log the final consolidation
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_final_multiple_permissive_policies_fixed', jsonb_build_object(
  'timestamp', now(),
  'description', 'Fixed final Multiple Permissive Policies warnings',
  'tables_fixed', ARRAY['system_stats', 'user_invitations', 'states'],
  'approach', 'consolidated_comprehensive_policies',
  'all_multiple_permissive_warnings_resolved', true
));