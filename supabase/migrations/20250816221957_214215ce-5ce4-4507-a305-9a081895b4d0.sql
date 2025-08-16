-- Optimizar política RLS de owner_operators para mejor performance
-- Reemplazar auth.uid() con (SELECT auth.uid()) para evitar re-evaluación por fila

DROP POLICY IF EXISTS "owner_operators_unified_access" ON public.owner_operators;

CREATE POLICY "owner_operators_unified_access" 
ON public.owner_operators 
FOR ALL 
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
  AND (
    -- Usuario es el owner operator
    user_id = (SELECT auth.uid()) 
    OR 
    -- Usuario tiene permisos administrativos en alguna empresa donde este usuario tiene rol
    EXISTS (
      SELECT 1 
      FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = owner_operators.user_id
      AND ucr1.is_active = true
      AND ucr2.user_id = (SELECT auth.uid())
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
  AND (
    -- Solo el propio usuario puede crear/actualizar su registro
    user_id = (SELECT auth.uid())
    OR
    -- O un administrador de su empresa
    EXISTS (
      SELECT 1 
      FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = owner_operators.user_id
      AND ucr1.is_active = true
      AND ucr2.user_id = (SELECT auth.uid())
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
);