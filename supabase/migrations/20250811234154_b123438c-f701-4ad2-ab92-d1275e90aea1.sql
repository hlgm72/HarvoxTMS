-- Corregir políticas RLS de profiles - quitar privilegios de superadmin sobre datos de empresas

-- Eliminar políticas que incluían superadmin incorrectamente
DROP POLICY IF EXISTS "Users and admins can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users and admins can update profiles" ON profiles;

-- Crear política de INSERT corregida - solo administradores de empresa
CREATE POLICY "Users and company admins can insert profiles" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
    AND (
      -- Usuario puede crear su propio perfil
      user_id = (SELECT auth.uid())
      OR
      -- Solo administradores de empresa pueden crear perfiles para conductores de SU empresa
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

-- Crear política de UPDATE corregida - solo administradores de empresa
CREATE POLICY "Users and company admins can update profiles" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
    AND (
      -- Usuario puede actualizar su propio perfil
      user_id = (SELECT auth.uid())
      OR
      -- Solo administradores de empresa pueden actualizar perfiles de conductores de SU empresa
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
    AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
    AND (
      -- Usuario puede actualizar su propio perfil
      user_id = (SELECT auth.uid())
      OR
      -- Solo administradores de empresa pueden actualizar perfiles de conductores de SU empresa
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