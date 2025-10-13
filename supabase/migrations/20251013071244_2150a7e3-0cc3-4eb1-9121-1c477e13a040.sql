-- Simplificar y corregir políticas RLS de user_payrolls
-- El problema es que las políticas están bloqueando acceso legítimo

-- 1. Eliminar políticas optimizadas anteriores
DROP POLICY IF EXISTS "user_payrolls_select_optimized" ON public.user_payrolls;
DROP POLICY IF EXISTS "user_payrolls_insert_optimized" ON public.user_payrolls;
DROP POLICY IF EXISTS "user_payrolls_update_optimized" ON public.user_payrolls;

-- 2. Crear política SELECT más permisiva y clara
CREATE POLICY "user_payrolls_select_all"
ON public.user_payrolls
FOR SELECT
TO authenticated
USING (
  -- Usuario autenticado y no anónimo
  (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false)
  AND (
    -- Puede ver sus propios registros
    user_id = (select auth.uid())
    OR
    -- O cualquier registro de su compañía
    EXISTS (
      SELECT 1 
      FROM user_company_roles ucr
      WHERE ucr.user_id = (select auth.uid())
      AND ucr.company_id = user_payrolls.company_id
      AND ucr.is_active = true
    )
  )
);

-- 3. Política INSERT
CREATE POLICY "user_payrolls_insert_all"
ON public.user_payrolls
FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.company_id = user_payrolls.company_id
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- 4. Política UPDATE
CREATE POLICY "user_payrolls_update_all"
ON public.user_payrolls
FOR UPDATE
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.company_id = user_payrolls.company_id
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
)
WITH CHECK (
  (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.company_id = user_payrolls.company_id
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);