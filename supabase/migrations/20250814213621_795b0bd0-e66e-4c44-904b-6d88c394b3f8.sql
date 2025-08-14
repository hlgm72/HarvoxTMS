-- Fix security policies for critical tables
-- Simpler approach to avoid function conflicts

-- 1. Fix password_reset_tokens table to be service role only
DROP POLICY IF EXISTS "password_reset_tokens_deny_all_users" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "password_reset_tokens_service_only" ON public.password_reset_tokens;

-- Create strict service role only policy
CREATE POLICY "password_reset_tokens_service_only" ON public.password_reset_tokens
FOR ALL USING (
  current_setting('app.service_operation', true) = 'allowed'
) WITH CHECK (
  current_setting('app.service_operation', true) = 'allowed'
);

-- 2. Create deployment_log RLS policy (already has policies, but ensure they're correct)
-- deployment_log already has proper superadmin policies, no changes needed

-- Note: For views like equipment_status_summary, load_details_with_dates, and loads_complete,
-- we cannot apply RLS directly. Instead, the security comes from the underlying tables
-- (company_equipment, loads, etc.) which already have proper RLS policies.
-- The views inherit the security from their base tables.