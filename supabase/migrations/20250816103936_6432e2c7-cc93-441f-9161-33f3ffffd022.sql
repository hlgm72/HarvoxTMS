-- Fix multiple permissive policies by consolidating duplicate policies

-- Drop duplicate policies for system_backups
DROP POLICY IF EXISTS system_backups_optimized ON public.system_backups;
DROP POLICY IF EXISTS system_backups_superadmin_only ON public.system_backups;

-- Drop duplicate policies for system_health_log  
DROP POLICY IF EXISTS system_health_log_optimized ON public.system_health_log;
DROP POLICY IF EXISTS system_health_log_superadmin_only ON public.system_health_log;

-- Create single consolidated policy for system_backups
CREATE POLICY system_backups_superadmin_access ON public.system_backups
FOR ALL TO public
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  )
);

-- Create single consolidated policy for system_health_log
CREATE POLICY system_health_log_superadmin_access ON public.system_health_log
FOR ALL TO public
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  )
);