-- Actualizar políticas RLS de profiles para permitir gestión por administradores

-- Eliminar políticas restrictivas actuales
DROP POLICY IF EXISTS "Authenticated users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Authenticated users can update their own profile" ON profiles;

-- Crear nueva política de INSERT que permite a administradores crear perfiles para conductores de su empresa
CREATE POLICY "Users and admins can insert profiles" ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
    AND (
      -- Usuario puede crear su propio perfil
      user_id = (SELECT auth.uid())
      OR
      -- Administradores pueden crear perfiles para conductores de su empresa
      user_id IN (
        SELECT ucr1.user_id
        FROM user_company_roles ucr1
        WHERE ucr1.company_id IN (
          SELECT ucr2.company_id
          FROM user_company_roles ucr2
          WHERE ucr2.user_id = (SELECT auth.uid())
          AND ucr2.is_active = true
          AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
        )
        AND ucr1.is_active = true
      )
    )
  );

-- Crear nueva política de UPDATE que permite a administradores actualizar perfiles de conductores de su empresa
CREATE POLICY "Users and admins can update profiles" ON profiles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
    AND (
      -- Usuario puede actualizar su propio perfil
      user_id = (SELECT auth.uid())
      OR
      -- Administradores pueden actualizar perfiles de conductores de su empresa
      user_id IN (
        SELECT ucr1.user_id
        FROM user_company_roles ucr1
        WHERE ucr1.company_id IN (
          SELECT ucr2.company_id
          FROM user_company_roles ucr2
          WHERE ucr2.user_id = (SELECT auth.uid())
          AND ucr2.is_active = true
          AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
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
      -- Administradores pueden actualizar perfiles de conductores de su empresa
      user_id IN (
        SELECT ucr1.user_id
        FROM user_company_roles ucr1
        WHERE ucr1.company_id IN (
          SELECT ucr2.company_id
          FROM user_company_roles ucr2
          WHERE ucr2.user_id = (SELECT auth.uid())
          AND ucr2.is_active = true
          AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
        )
        AND ucr1.is_active = true
      )
    )
  );