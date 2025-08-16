-- Consolidar políticas duplicadas en owner_operators
-- Eliminar políticas existentes que causan conflicto
DROP POLICY IF EXISTS "Owner operators company access" ON public.owner_operators;
DROP POLICY IF EXISTS "owner_operators_user_access_only" ON public.owner_operators;

-- Crear política unificada y optimizada
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
    -- Usuario tiene permisos administrativos en la empresa
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false 
  AND company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);