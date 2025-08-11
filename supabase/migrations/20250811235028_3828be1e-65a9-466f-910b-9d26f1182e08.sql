-- CORRECCIÓN FINAL: Quitar acceso de superadmin a user_company_roles y owner_operators

-- 1. USER_COMPANY_ROLES: Superadmin NO debe gestionar roles de usuarios en empresas
DROP POLICY IF EXISTS "user_company_roles_delete_policy" ON user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_insert_policy" ON user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_update_policy" ON user_company_roles;

CREATE POLICY "user_company_roles_delete_company_admins" ON user_company_roles
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
    AND is_user_admin_in_company_safe((SELECT auth.uid()), company_id)
  );

CREATE POLICY "user_company_roles_insert_company_admins" ON user_company_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
    AND is_user_admin_in_company_safe((SELECT auth.uid()), company_id)
  );

CREATE POLICY "user_company_roles_update_company_admins" ON user_company_roles
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

-- 2. OWNER_OPERATORS: Quitar superadmin de la política
DROP POLICY IF EXISTS "Owner operators access policy" ON owner_operators;

CREATE POLICY "Owner operators company access" ON owner_operators
  FOR ALL
  TO public
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE 
    AND (
      -- El usuario puede ver/editar su propio registro
      (SELECT auth.uid()) = user_id 
      OR 
      -- Solo administradores de empresa pueden gestionar owner operators de SU empresa
      user_id IN (
        SELECT ucr1.user_id
        FROM user_company_roles ucr1
        WHERE ucr1.company_id IN (
          SELECT ucr2.company_id
          FROM user_company_roles ucr2
          WHERE ucr2.user_id = (SELECT auth.uid())
          AND ucr2.is_active = true
          AND ucr2.role IN ('company_owner', 'operations_manager')
        )
        AND ucr1.is_active = true
      )
    )
  )
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL 
    AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE 
    AND (
      -- Puede crear para sí mismo
      (SELECT auth.uid()) = user_id
      OR
      -- Solo administradores de empresa pueden crear para conductores de SU empresa
      user_id IN (
        SELECT ucr1.user_id
        FROM user_company_roles ucr1
        WHERE ucr1.company_id IN (
          SELECT ucr2.company_id
          FROM user_company_roles ucr2
          WHERE ucr2.user_id = (SELECT auth.uid())
          AND ucr2.is_active = true
          AND ucr2.role IN ('company_owner', 'operations_manager')
        )
        AND ucr1.is_active = true
      )
    )
  );