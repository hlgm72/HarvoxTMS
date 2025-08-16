-- Consolidar políticas duplicadas en owner_operators
-- Eliminar políticas existentes que causan conflicto
DROP POLICY IF EXISTS "Owner operators company access" ON public.owner_operators;
DROP POLICY IF EXISTS "owner_operators_user_access_only" ON public.owner_operators;

-- Crear política unificada y optimizada para owner_operators
CREATE POLICY "owner_operators_unified_access" 
ON public.owner_operators 
FOR ALL 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false 
  AND (
    -- Usuario es el owner operator
    user_id = auth.uid() 
    OR 
    -- Usuario tiene permisos administrativos en alguna empresa donde este usuario tiene rol
    EXISTS (
      SELECT 1 
      FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = owner_operators.user_id
      AND ucr1.is_active = true
      AND ucr2.user_id = auth.uid()
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false 
  AND (
    -- Solo el propio usuario puede crear/actualizar su registro
    user_id = auth.uid()
    OR
    -- O un administrador de su empresa
    EXISTS (
      SELECT 1 
      FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = owner_operators.user_id
      AND ucr1.is_active = true
      AND ucr2.user_id = auth.uid()
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
);