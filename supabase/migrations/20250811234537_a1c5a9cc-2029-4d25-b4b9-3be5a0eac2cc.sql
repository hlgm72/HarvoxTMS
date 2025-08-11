-- CORRECCIÓN CRÍTICA: Quitar acceso indebido de superadmin a datos de empresas

-- 1. COMPANIES: Superadmin NO debe poder actualizar empresas existentes (solo crearlas y ver lista)
DROP POLICY IF EXISTS "Consolidated companies update policy" ON companies;

CREATE POLICY "Company admins can update companies" ON companies
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE 
    AND user_is_admin_in_company((SELECT auth.uid()), id)
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL 
    AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE 
    AND user_is_admin_in_company((SELECT auth.uid()), id)
  );

-- Corregir SELECT de companies - superadmin solo puede ver lista básica, no acceder a empresas específicas
DROP POLICY IF EXISTS "Consolidated companies select policy" ON companies;

CREATE POLICY "Companies select policy" ON companies
  FOR SELECT
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE 
    AND (
      -- Usuarios de empresa pueden ver su empresa
      id IN (
        SELECT ucr.company_id
        FROM user_company_roles ucr
        WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
      )
      OR
      -- Superadmin puede ver lista básica para administración del sistema
      is_superadmin((SELECT auth.uid()))
    )
  );

-- 2. COMPANY_PAYMENT_PERIODS: Superadmin NO debe acceder a períodos de pago de empresas
DROP POLICY IF EXISTS "company_payment_periods_delete" ON company_payment_periods;
DROP POLICY IF EXISTS "company_payment_periods_insert" ON company_payment_periods;
DROP POLICY IF EXISTS "company_payment_periods_update" ON company_payment_periods;

CREATE POLICY "company_payment_periods_delete_company_admins" ON company_payment_periods
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
    AND is_user_admin_in_company_safe((SELECT auth.uid()), company_id)
  );

CREATE POLICY "company_payment_periods_insert_company_admins" ON company_payment_periods
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
    AND is_user_admin_in_company_safe((SELECT auth.uid()), company_id)
  );

CREATE POLICY "company_payment_periods_update_company_admins" ON company_payment_periods
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
    AND is_user_admin_in_company_safe((SELECT auth.uid()), company_id)
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
    AND is_user_admin_in_company_safe((SELECT auth.uid()), company_id)
  );