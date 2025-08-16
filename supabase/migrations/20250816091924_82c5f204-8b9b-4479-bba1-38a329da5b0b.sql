-- CREATE RLS POLICIES FOR TABLES MISSING THEM

-- ================================
-- 1. COMPANY_PAYMENT_PERIODS - Company users access
-- ================================
CREATE POLICY "company_payment_periods_company_access"
  ON company_payment_periods FOR ALL
  USING (
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
    )
  )
  WITH CHECK (
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  );

-- ================================
-- 2. DEPLOYMENT_LOG - Superadmin only access
-- ================================
CREATE POLICY "deployment_log_superadmin_only"
  ON deployment_log FOR ALL
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

-- ================================
-- 3. LOADS_ARCHIVE - Company users access (view only)
-- ================================
CREATE POLICY "loads_archive_company_view"
  ON loads_archive FOR SELECT
  USING (
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    (
      -- Drivers can see their own archived loads
      driver_user_id = auth.uid() OR
      -- Company users can see archived loads in their company
      EXISTS (
        SELECT 1 FROM user_company_roles ucr
        WHERE ucr.user_id = auth.uid()
        AND ucr.is_active = true
        AND ucr.company_id = company_id
      )
    )
  );

CREATE POLICY "loads_archive_superadmin_manage"
  ON loads_archive FOR ALL
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

-- ================================
-- 4. SYSTEM_BACKUPS - Superadmin only access
-- ================================
CREATE POLICY "system_backups_superadmin_only"
  ON system_backups FOR ALL
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

-- ================================
-- 5. SYSTEM_HEALTH_LOG - Superadmin only access
-- ================================
CREATE POLICY "system_health_log_superadmin_only"
  ON system_health_log FOR ALL
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