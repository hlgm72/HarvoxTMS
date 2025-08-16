-- Fix RLS performance issues and consolidate duplicate policies
-- Address auth function re-evaluation and multiple permissive policies warnings

-- First, drop all existing policies on password_reset_tokens to clean up duplicates
DROP POLICY IF EXISTS "Users can access own reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "password_reset_tokens_service_only" ON public.password_reset_tokens;

-- Create optimized policy for password_reset_tokens with proper auth function caching
CREATE POLICY "password_reset_tokens_access_policy"
ON public.password_reset_tokens
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND user_email = (SELECT auth.email())
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND user_email = (SELECT auth.email())
);

-- Drop all existing policies on user_invitations to clean up duplicates
DROP POLICY IF EXISTS "Company admins can manage invitations" ON public.user_invitations;
DROP POLICY IF EXISTS "Users can view invitations sent to them" ON public.user_invitations;
DROP POLICY IF EXISTS "User invitations admin delete policy" ON public.user_invitations;
DROP POLICY IF EXISTS "User invitations admin insert policy" ON public.user_invitations;
DROP POLICY IF EXISTS "User invitations admin update policy" ON public.user_invitations;
DROP POLICY IF EXISTS "User invitations access policy" ON public.user_invitations;

-- Create consolidated optimized policy for user_invitations with proper auth function caching
CREATE POLICY "user_invitations_consolidated_policy"
ON public.user_invitations
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    -- Company admins can manage invitations for their companies
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
    OR
    -- Users can view invitations sent to their email
    email = (SELECT auth.email())
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- Log the performance optimization
INSERT INTO deployment_log (
  deployment_id,
  event_type,
  status,
  event_data
) VALUES (
  'rls-performance-fix-' || extract(epoch from now())::text,
  'rls_performance_optimization',
  'completed',
  jsonb_build_object(
    'action', 'fix_auth_function_caching_and_consolidate_policies',
    'tables_optimized', jsonb_build_array('password_reset_tokens', 'user_invitations'),
    'issues_fixed', jsonb_build_array('auth_rls_initplan', 'multiple_permissive_policies'),
    'performance_improvement', 'significant',
    'policies_consolidated', true,
    'timestamp', now()
  )
);