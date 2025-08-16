-- FIX RLS PERFORMANCE WARNINGS - PART 4 (FINAL)

-- ================================
-- 1. OPTIMIZE SECURITY AUDIT LOG POLICIES
-- ================================

DROP POLICY IF EXISTS "security_audit_log_secure_superadmin" ON security_audit_log;

CREATE POLICY "security_audit_log_optimized"
  ON security_audit_log FOR ALL
  USING (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  );

-- ================================
-- 2. OPTIMIZE LOADS_ARCHIVE POLICIES
-- ================================

DROP POLICY IF EXISTS "loads_archive_company_view" ON loads_archive;
DROP POLICY IF EXISTS "loads_archive_superadmin_manage" ON loads_archive;

CREATE POLICY "loads_archive_optimized_view"
  ON loads_archive FOR SELECT
  USING (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    (
      driver_user_id = (SELECT auth.uid()) OR
      EXISTS (
        SELECT 1 FROM user_company_roles ucr
        WHERE ucr.user_id = (SELECT auth.uid())
        AND ucr.is_active = true
        AND ucr.company_id = company_id
      )
    )
  );

CREATE POLICY "loads_archive_optimized_manage"
  ON loads_archive FOR ALL
  USING (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  );

-- ================================
-- 3. OPTIMIZE SYSTEM TABLES POLICIES
-- ================================

DROP POLICY IF EXISTS "archive_logs_superadmin_policy" ON archive_logs;
DROP POLICY IF EXISTS "system_backups_superadmin_only" ON system_backups;
DROP POLICY IF EXISTS "deployment_log_superadmin_only" ON deployment_log;
DROP POLICY IF EXISTS "system_health_log_superadmin_only" ON system_health_log;

CREATE POLICY "archive_logs_optimized"
  ON archive_logs FOR ALL
  USING (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    is_user_superadmin_safe((SELECT auth.uid()))
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    is_user_superadmin_safe((SELECT auth.uid()))
  );

CREATE POLICY "system_backups_optimized"
  ON system_backups FOR ALL
  USING (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  );

CREATE POLICY "deployment_log_optimized"
  ON deployment_log FOR ALL
  USING (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  );

CREATE POLICY "system_health_log_optimized"
  ON system_health_log FOR ALL
  USING (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  );