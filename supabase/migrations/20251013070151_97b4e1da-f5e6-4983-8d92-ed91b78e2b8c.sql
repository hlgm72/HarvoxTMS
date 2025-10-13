-- Optimizar políticas RLS de user_payrolls y loads para mejor rendimiento
-- Problema 1: Reemplazar auth.uid() con (select auth.uid()) para evitar re-evaluaciones
-- Problema 2: Consolidar múltiples políticas permisivas en una sola

-- 1. DROP políticas existentes de user_payrolls
DROP POLICY IF EXISTS "user_payrolls_select" ON public.user_payrolls;
DROP POLICY IF EXISTS "user_payrolls_select_own" ON public.user_payrolls;
DROP POLICY IF EXISTS "user_payrolls_select_company" ON public.user_payrolls;
DROP POLICY IF EXISTS "user_payrolls_insert_company" ON public.user_payrolls;
DROP POLICY IF EXISTS "user_payrolls_update" ON public.user_payrolls;
DROP POLICY IF EXISTS "user_payrolls_update_company" ON public.user_payrolls;

-- 2. Crear política consolidada y optimizada para SELECT
CREATE POLICY "user_payrolls_select_optimized"
ON public.user_payrolls
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false)
  AND (
    -- Usuario puede ver sus propios payrolls
    user_id = (select auth.uid())
    OR
    -- O si es de la misma compañía
    company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = (select auth.uid()) 
      AND is_active = true
    )
  )
);

-- 3. Crear política consolidada y optimizada para INSERT
CREATE POLICY "user_payrolls_insert_optimized"
ON public.user_payrolls
FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false)
  AND company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (select auth.uid()) 
    AND is_active = true
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- 4. Crear política consolidada y optimizada para UPDATE
CREATE POLICY "user_payrolls_update_optimized"
ON public.user_payrolls
FOR UPDATE
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false)
  AND company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (select auth.uid()) 
    AND is_active = true
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
)
WITH CHECK (
  (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false)
  AND company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (select auth.uid()) 
    AND is_active = true
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- 5. Optimizar política de loads
DROP POLICY IF EXISTS "loads_select_company_access" ON public.loads;

CREATE POLICY "loads_select_company_access_optimized"
ON public.loads
FOR SELECT
TO authenticated
USING (
  (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false)
  AND (
    -- Usuario es el driver
    driver_user_id = (select auth.uid())
    OR
    -- Usuario creó la carga
    created_by = (select auth.uid())
    OR
    -- Driver está en la misma compañía
    driver_user_id IN (
      SELECT ucr1.user_id
      FROM user_company_roles ucr1
      WHERE ucr1.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (select auth.uid())
        AND ucr2.is_active = true
      )
      AND ucr1.is_active = true
    )
  )
);