
-- Optimize RLS policies to prevent re-evaluation of auth functions
-- Wrap auth.uid() and auth.jwt() with SELECT for better performance

-- ============================================
-- 1. FIX company_payment_periods POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS cpp_select ON company_payment_periods;
DROP POLICY IF EXISTS cpp_insert ON company_payment_periods;
DROP POLICY IF EXISTS cpp_update ON company_payment_periods;

-- Recreate with optimized auth calls
CREATE POLICY cpp_select ON company_payment_periods
  FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false)
    AND company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid())
        AND user_company_roles.is_active = true
    )
  );

CREATE POLICY cpp_insert ON company_payment_periods
  FOR INSERT
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL 
    AND NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false)
    AND company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid())
        AND user_company_roles.is_active = true
        AND user_company_roles.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  );

CREATE POLICY cpp_update ON company_payment_periods
  FOR UPDATE
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false)
    AND company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid())
        AND user_company_roles.is_active = true
        AND user_company_roles.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  );

-- ============================================
-- 2. FIX user_payrolls POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS user_payrolls_select ON user_payrolls;
DROP POLICY IF EXISTS user_payrolls_update ON user_payrolls;
DROP POLICY IF EXISTS user_payrolls_delete ON user_payrolls;

-- Recreate with optimized auth calls
CREATE POLICY user_payrolls_select ON user_payrolls
  FOR SELECT
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false)
    AND (
      user_id = (SELECT auth.uid())
      OR company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE user_company_roles.user_id = (SELECT auth.uid())
          AND user_company_roles.is_active = true
      )
    )
  );

CREATE POLICY user_payrolls_update ON user_payrolls
  FOR UPDATE
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false)
    AND company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid())
        AND user_company_roles.is_active = true
        AND user_company_roles.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL 
    AND NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false)
    AND company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid())
        AND user_company_roles.is_active = true
        AND user_company_roles.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  );

CREATE POLICY user_payrolls_delete ON user_payrolls
  FOR DELETE
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false)
    AND company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid())
        AND user_company_roles.is_active = true
        AND user_company_roles.role = 'superadmin'
    )
  );

-- Add performance comment
COMMENT ON TABLE company_payment_periods IS 'Company payment periods with optimized RLS policies';
COMMENT ON TABLE user_payrolls IS 'User payroll calculations with optimized RLS policies';
