-- Fix RLS performance issues: optimize auth function calls in system tables

-- 1. Fix system_backups policies
DROP POLICY IF EXISTS "system_backups_select_superadmin" ON public.system_backups;
DROP POLICY IF EXISTS "system_backups_insert_superadmin" ON public.system_backups;
DROP POLICY IF EXISTS "system_backups_update_superadmin" ON public.system_backups;
DROP POLICY IF EXISTS "system_backups_delete_superadmin" ON public.system_backups;

-- Create optimized system_backups policies
CREATE POLICY "system_backups_select_superadmin" ON public.system_backups
FOR SELECT USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "system_backups_insert_superadmin" ON public.system_backups
FOR INSERT WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "system_backups_update_superadmin" ON public.system_backups
FOR UPDATE USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "system_backups_delete_superadmin" ON public.system_backups
FOR DELETE USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

-- 2. Fix deployment_log policies
DROP POLICY IF EXISTS "deployment_log_select_superadmin" ON public.deployment_log;
DROP POLICY IF EXISTS "deployment_log_insert_superadmin" ON public.deployment_log;
DROP POLICY IF EXISTS "deployment_log_update_superadmin" ON public.deployment_log;
DROP POLICY IF EXISTS "deployment_log_delete_superadmin" ON public.deployment_log;

-- Create optimized deployment_log policies
CREATE POLICY "deployment_log_select_superadmin" ON public.deployment_log
FOR SELECT USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "deployment_log_insert_superadmin" ON public.deployment_log
FOR INSERT WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "deployment_log_update_superadmin" ON public.deployment_log
FOR UPDATE USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "deployment_log_delete_superadmin" ON public.deployment_log
FOR DELETE USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

-- 3. Fix system_health_log policies
DROP POLICY IF EXISTS "system_health_log_select_superadmin" ON public.system_health_log;
DROP POLICY IF EXISTS "system_health_log_insert_superadmin" ON public.system_health_log;
DROP POLICY IF EXISTS "system_health_log_update_superadmin" ON public.system_health_log;
DROP POLICY IF EXISTS "system_health_log_delete_superadmin" ON public.system_health_log;

-- Create optimized system_health_log policies
CREATE POLICY "system_health_log_select_superadmin" ON public.system_health_log
FOR SELECT USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "system_health_log_insert_superadmin" ON public.system_health_log
FOR INSERT WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "system_health_log_update_superadmin" ON public.system_health_log
FOR UPDATE USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);

CREATE POLICY "system_health_log_delete_superadmin" ON public.system_health_log
FOR DELETE USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  is_authenticated_superadmin()
);