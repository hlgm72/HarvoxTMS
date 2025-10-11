-- =====================================================
-- Optimización de RLS Policies para user_payment_periods
-- Reemplazar auth.uid(), auth.role(), auth.jwt() con (select ...)
-- para evitar re-evaluación en cada fila
-- =====================================================

-- 1. DROP políticas existentes
DROP POLICY IF EXISTS "user_payment_periods_select_policy" ON public.user_payment_periods;
DROP POLICY IF EXISTS "user_payment_periods_update_if_not_locked" ON public.user_payment_periods;
DROP POLICY IF EXISTS "user_payment_periods_delete_if_not_locked" ON public.user_payment_periods;

-- 2. Recrear política SELECT optimizada
CREATE POLICY "user_payment_periods_select_policy" 
ON public.user_payment_periods
FOR SELECT
USING (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE((((select auth.jwt()) ->> 'is_anonymous'::text))::boolean, false)
  AND (
    (select auth.uid()) = user_id 
    OR company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid())
        AND user_company_roles.is_active = true
    )
  )
);

-- 3. Recrear política UPDATE optimizada
CREATE POLICY "user_payment_periods_update_if_not_locked" 
ON public.user_payment_periods
FOR UPDATE
USING (
  (select auth.uid()) IS NOT NULL
  AND (select auth.role()) = 'authenticated'
  AND NOT COALESCE((((select auth.jwt()) ->> 'is_anonymous'::text))::boolean, false)
  AND NOT is_locked
  AND company_id IN (
    SELECT user_company_roles.company_id
    FROM user_company_roles
    WHERE user_company_roles.user_id = (select auth.uid())
      AND user_company_roles.is_active = true
      AND user_company_roles.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
)
WITH CHECK (
  (select auth.uid()) IS NOT NULL
  AND (select auth.role()) = 'authenticated'
  AND NOT COALESCE((((select auth.jwt()) ->> 'is_anonymous'::text))::boolean, false)
  AND NOT is_locked
);

-- 4. Recrear política DELETE optimizada
CREATE POLICY "user_payment_periods_delete_if_not_locked" 
ON public.user_payment_periods
FOR DELETE
USING (
  (select auth.uid()) IS NOT NULL
  AND (select auth.role()) = 'authenticated'
  AND NOT COALESCE((((select auth.jwt()) ->> 'is_anonymous'::text))::boolean, false)
  AND NOT is_locked
  AND company_id IN (
    SELECT user_company_roles.company_id
    FROM user_company_roles
    WHERE user_company_roles.user_id = (select auth.uid())
      AND user_company_roles.is_active = true
      AND user_company_roles.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);