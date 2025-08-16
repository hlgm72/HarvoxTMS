-- CONTINUE OPTIMIZING RLS POLICIES (FINAL PART)

-- ================================
-- 6. OPTIMIZE LOAD_STOPS POLICIES
-- ================================

-- Drop and recreate with optimized auth calls
DROP POLICY IF EXISTS "load_stops_secure_select" ON load_stops;
DROP POLICY IF EXISTS "load_stops_secure_insert" ON load_stops;
DROP POLICY IF EXISTS "load_stops_secure_update" ON load_stops;
DROP POLICY IF EXISTS "load_stops_secure_delete" ON load_stops;

CREATE POLICY "load_stops_optimized_select"
  ON load_stops FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    load_id IN (
      SELECT l.id
      FROM loads l
      LEFT JOIN driver_period_calculations dpc ON l.payment_period_id = dpc.id
      LEFT JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      LEFT JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE (
        -- Driver can see their own loads
        l.driver_user_id = (SELECT auth.uid()) OR
        -- Company users can see loads in their company
        (ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true)
      )
    )
  );

CREATE POLICY "load_stops_optimized_insert"
  ON load_stops FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    load_id IN (
      SELECT l.id
      FROM loads l
      LEFT JOIN driver_period_calculations dpc ON l.payment_period_id = dpc.id
      LEFT JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      LEFT JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE (
        ucr.user_id = (SELECT auth.uid()) 
        AND ucr.is_active = true
        AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
      )
    )
  );

CREATE POLICY "load_stops_optimized_update"
  ON load_stops FOR UPDATE
  USING (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    load_id IN (
      SELECT l.id
      FROM loads l
      LEFT JOIN driver_period_calculations dpc ON l.payment_period_id = dpc.id
      LEFT JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      LEFT JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE (
        -- Drivers can update their own load stops
        l.driver_user_id = (SELECT auth.uid()) OR
        -- Company admins can update load stops
        (ucr.user_id = (SELECT auth.uid()) 
         AND ucr.is_active = true
         AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin'))
      )
    )
  );

CREATE POLICY "load_stops_optimized_delete"
  ON load_stops FOR DELETE
  USING (
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    load_id IN (
      SELECT l.id
      FROM loads l
      LEFT JOIN driver_period_calculations dpc ON l.payment_period_id = dpc.id
      LEFT JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      LEFT JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE (
        ucr.user_id = (SELECT auth.uid()) 
        AND ucr.is_active = true
        AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
      )
    )
  );

-- ================================
-- 7. OPTIMIZE REMAINING POLICIES
-- ================================

-- Optimize company_payment_periods policy
DROP POLICY IF EXISTS "company_payment_periods_company_access" ON company_payment_periods;

CREATE POLICY "company_payment_periods_optimized"
  ON company_payment_periods FOR ALL
  USING (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
    )
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  );

-- Optimize security_audit_log policy
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

-- Optimize loads_archive policies
DROP POLICY IF EXISTS "loads_archive_company_view" ON loads_archive;
DROP POLICY IF EXISTS "loads_archive_superadmin_manage" ON loads_archive;

CREATE POLICY "loads_archive_optimized_view"
  ON loads_archive FOR SELECT
  USING (
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND
    COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
    (
      -- Drivers can see their own archived loads
      driver_user_id = (SELECT auth.uid()) OR
      -- Company users can see archived loads in their company
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

-- Optimize archive_logs policy
DROP POLICY IF EXISTS "archive_logs_superadmin_policy" ON archive_logs;

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

-- Optimize system tables policies
DROP POLICY IF EXISTS "system_backups_superadmin_only" ON system_backups;
DROP POLICY IF EXISTS "deployment_log_superadmin_only" ON deployment_log;
DROP POLICY IF EXISTS "system_health_log_superadmin_only" ON system_health_log;

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