-- Optimizar policy de owner_operators para mejor performance
DROP POLICY IF EXISTS "Owner operators access policy" ON owner_operators;

-- Policy optimizada que usa SELECT para evitar re-evaluación en cada fila
CREATE POLICY "Owner operators access policy" ON owner_operators
  FOR ALL
  TO public
  USING (
    (SELECT auth.uid()) IS NOT NULL 
    AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE 
    AND (
      -- El usuario puede ver/editar su propio registro
      (SELECT auth.uid()) = user_id 
      OR 
      -- O es admin en una empresa donde el conductor (user_id) también está
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
    AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE 
    AND (
      -- Puede crear para sí mismo
      (SELECT auth.uid()) = user_id
      OR
      -- O puede crear para conductores de su empresa si es admin
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