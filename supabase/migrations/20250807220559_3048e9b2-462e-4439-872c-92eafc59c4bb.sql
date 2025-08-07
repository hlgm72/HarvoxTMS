-- ================================
-- FIX: ANONYMOUS ACCESS SECURITY WARNINGS
-- ================================

-- Drop existing policies that allow anonymous access
DROP POLICY IF EXISTS "system_backups_superadmin_only" ON public.system_backups;
DROP POLICY IF EXISTS "deployment_log_superadmin_only" ON public.deployment_log;
DROP POLICY IF EXISTS "system_health_log_superadmin_only" ON public.system_health_log;

-- Create secure helper function to check if user is authenticated superadmin
CREATE OR REPLACE FUNCTION public.is_authenticated_superadmin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND 
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND role = 'superadmin' 
      AND is_active = true
    );
$$;

-- Create new secure policies that explicitly reject anonymous users

-- System Backups - Only authenticated superadmins
CREATE POLICY "system_backups_authenticated_superadmin_only" 
ON public.system_backups
FOR ALL 
TO authenticated
USING (is_authenticated_superadmin())
WITH CHECK (is_authenticated_superadmin());

-- Deployment Log - Only authenticated superadmins  
CREATE POLICY "deployment_log_authenticated_superadmin_only" 
ON public.deployment_log
FOR ALL 
TO authenticated
USING (is_authenticated_superadmin())
WITH CHECK (is_authenticated_superadmin());

-- System Health Log - Only authenticated superadmins
CREATE POLICY "system_health_log_authenticated_superadmin_only" 
ON public.system_health_log
FOR ALL 
TO authenticated
USING (is_authenticated_superadmin())
WITH CHECK (is_authenticated_superadmin());

-- Additional security: Explicitly deny all access to anon role
CREATE POLICY "system_backups_deny_anon" 
ON public.system_backups
FOR ALL 
TO anon
USING (false);

CREATE POLICY "deployment_log_deny_anon" 
ON public.deployment_log
FOR ALL 
TO anon
USING (false);

CREATE POLICY "system_health_log_deny_anon" 
ON public.system_health_log
FOR ALL 
TO anon
USING (false);

-- Grant proper permissions to authenticated role for these system tables
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.system_backups TO authenticated;
GRANT ALL ON public.deployment_log TO authenticated;
GRANT ALL ON public.system_health_log TO authenticated;

-- Ensure service role can still access these tables
GRANT ALL ON public.system_backups TO service_role;
GRANT ALL ON public.deployment_log TO service_role;
GRANT ALL ON public.system_health_log TO service_role;