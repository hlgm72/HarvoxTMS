-- Corregir política RLS de driver_profiles para permitir que administradores gestionen conductores

DROP POLICY IF EXISTS "Driver profiles company access" ON driver_profiles;

-- Crear nueva política que permite a administradores de empresa gestionar perfiles de conductores
CREATE POLICY "Driver profiles company access corrected" ON driver_profiles
  FOR ALL
  TO public
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE 
    AND (
      -- El usuario puede ver/editar su propio perfil
      (SELECT auth.uid()) = user_id 
      OR 
      -- Administradores de empresa pueden gestionar perfiles de conductores de SU empresa
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
      -- Administradores de empresa pueden crear perfiles para conductores de SU empresa
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