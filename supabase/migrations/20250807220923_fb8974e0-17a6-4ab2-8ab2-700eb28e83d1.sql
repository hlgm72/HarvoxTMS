-- ================================
-- FIX: PERSISTENT ANONYMOUS ACCESS WARNINGS
-- ================================

-- Drop ALL existing policies for these tables
DROP POLICY IF EXISTS "system_backups_authenticated_superadmin_only" ON public.system_backups;
DROP POLICY IF EXISTS "deployment_log_authenticated_superadmin_only" ON public.deployment_log;
DROP POLICY IF EXISTS "system_health_log_authenticated_superadmin_only" ON public.system_health_log;
DROP POLICY IF EXISTS "system_backups_deny_anon" ON public.system_backups;
DROP POLICY IF EXISTS "deployment_log_deny_anon" ON public.deployment_log;
DROP POLICY IF EXISTS "system_health_log_deny_anon" ON public.system_health_log;

-- Create more restrictive policies with separate operations
-- These policies will ONLY apply to authenticated users and explicitly check superadmin status

-- SYSTEM_BACKUPS policies
CREATE POLICY "system_backups_select_superadmin" 
ON public.system_backups
FOR SELECT 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "system_backups_insert_superadmin" 
ON public.system_backups
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "system_backups_update_superadmin" 
ON public.system_backups
FOR UPDATE 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "system_backups_delete_superadmin" 
ON public.system_backups
FOR DELETE 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

-- DEPLOYMENT_LOG policies
CREATE POLICY "deployment_log_select_superadmin" 
ON public.deployment_log
FOR SELECT 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "deployment_log_insert_superadmin" 
ON public.deployment_log
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "deployment_log_update_superadmin" 
ON public.deployment_log
FOR UPDATE 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "deployment_log_delete_superadmin" 
ON public.deployment_log
FOR DELETE 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

-- SYSTEM_HEALTH_LOG policies
CREATE POLICY "system_health_log_select_superadmin" 
ON public.system_health_log
FOR SELECT 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "system_health_log_insert_superadmin" 
ON public.system_health_log
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "system_health_log_update_superadmin" 
ON public.system_health_log
FOR UPDATE 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "system_health_log_delete_superadmin" 
ON public.system_health_log
FOR DELETE 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

-- Revoke all permissions from anon role to be absolutely sure
REVOKE ALL ON public.system_backups FROM anon;
REVOKE ALL ON public.deployment_log FROM anon;
REVOKE ALL ON public.system_health_log FROM anon;

-- Ensure service_role still has access for edge functions
GRANT ALL ON public.system_backups TO service_role;
GRANT ALL ON public.deployment_log TO service_role;
GRANT ALL ON public.system_health_log TO service_role;