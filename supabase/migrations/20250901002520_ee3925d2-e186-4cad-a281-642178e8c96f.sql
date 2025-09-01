-- ===================================================================
-- CONSOLIDACIÓN DE POLÍTICAS RLS PARA OPTIMIZACIÓN DE RENDIMIENTO
-- Eliminar políticas conflictivas y crear políticas consolidadas
-- ===================================================================

-- ================================
-- 1. CONSOLIDAR loads_archive
-- ================================

-- Eliminar la política ALL que causa conflicto
DROP POLICY IF EXISTS "loads_archive_company_access" ON public.loads_archive;

-- Crear políticas específicas consolidadas para loads_archive
DROP POLICY IF EXISTS "loads_archive_select_consolidated" ON public.loads_archive;
CREATE POLICY "loads_archive_select_consolidated" ON public.loads_archive
FOR SELECT USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (driver_user_id = (SELECT auth.uid()) OR 
   driver_user_id IN (
     SELECT ucr.user_id
     FROM user_company_roles ucr
     JOIN user_company_roles my_role ON ucr.company_id = my_role.company_id
     WHERE my_role.user_id = (SELECT auth.uid()) 
       AND my_role.is_active = true
       AND my_role.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
   )
  )
);

DROP POLICY IF EXISTS "loads_archive_insert_consolidated" ON public.loads_archive;
CREATE POLICY "loads_archive_insert_consolidated" ON public.loads_archive
FOR INSERT WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (driver_user_id = (SELECT auth.uid()) OR 
   driver_user_id IN (
     SELECT ucr.user_id
     FROM user_company_roles ucr
     JOIN user_company_roles my_role ON ucr.company_id = my_role.company_id
     WHERE my_role.user_id = (SELECT auth.uid()) 
       AND my_role.is_active = true
       AND my_role.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
   )
  )
);

-- CONSOLIDAR UPDATE: Combinar acceso de empresa + inmutabilidad
DROP POLICY IF EXISTS "loads_archive_update_immutable_after_payment" ON public.loads_archive;
DROP POLICY IF EXISTS "loads_archive_update_consolidated" ON public.loads_archive;
CREATE POLICY "loads_archive_update_consolidated" ON public.loads_archive
FOR UPDATE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (driver_user_id = (SELECT auth.uid()) OR 
   driver_user_id IN (
     SELECT ucr.user_id
     FROM user_company_roles ucr
     JOIN user_company_roles my_role ON ucr.company_id = my_role.company_id
     WHERE my_role.user_id = (SELECT auth.uid()) 
       AND my_role.is_active = true
       AND my_role.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
   )
  ) AND 
  -- PROTECCIÓN CRÍTICA: Impedir modificaciones si período está bloqueado
  (payment_period_id IS NULL OR NOT is_payment_period_locked(payment_period_id))
) WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (driver_user_id = (SELECT auth.uid()) OR 
   driver_user_id IN (
     SELECT ucr.user_id
     FROM user_company_roles ucr
     JOIN user_company_roles my_role ON ucr.company_id = my_role.company_id
     WHERE my_role.user_id = (SELECT auth.uid()) 
       AND my_role.is_active = true
       AND my_role.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
   )
  ) AND 
  (payment_period_id IS NULL OR NOT is_payment_period_locked(payment_period_id))
);

-- CONSOLIDAR DELETE: Combinar acceso de empresa + inmutabilidad
DROP POLICY IF EXISTS "loads_archive_delete_immutable_after_payment" ON public.loads_archive;
DROP POLICY IF EXISTS "loads_archive_delete_consolidated" ON public.loads_archive;
CREATE POLICY "loads_archive_delete_consolidated" ON public.loads_archive
FOR DELETE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (driver_user_id = (SELECT auth.uid()) OR 
   driver_user_id IN (
     SELECT ucr.user_id
     FROM user_company_roles ucr
     JOIN user_company_roles my_role ON ucr.company_id = my_role.company_id
     WHERE my_role.user_id = (SELECT auth.uid()) 
       AND my_role.is_active = true
       AND my_role.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
   )
  ) AND 
  -- PROTECCIÓN CRÍTICA: Impedir eliminaciones si período está bloqueado
  (payment_period_id IS NULL OR NOT is_payment_period_locked(payment_period_id))
);

-- ================================
-- 2. CONSOLIDAR recurring_expense_exclusions  
-- ================================

-- Eliminar la política ALL que causa conflicto
DROP POLICY IF EXISTS "exclusions_permanent_users_only" ON public.recurring_expense_exclusions;

-- Crear políticas específicas consolidadas para recurring_expense_exclusions
DROP POLICY IF EXISTS "recurring_expense_exclusions_select_consolidated" ON public.recurring_expense_exclusions;
CREATE POLICY "recurring_expense_exclusions_select_consolidated" ON public.recurring_expense_exclusions
FOR SELECT USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false
);

DROP POLICY IF EXISTS "recurring_expense_exclusions_insert_consolidated" ON public.recurring_expense_exclusions;
CREATE POLICY "recurring_expense_exclusions_insert_consolidated" ON public.recurring_expense_exclusions
FOR INSERT WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false
);

-- CONSOLIDAR UPDATE: Combinar acceso + inmutabilidad
DROP POLICY IF EXISTS "recurring_expense_exclusions_update_immutable_after_payment" ON public.recurring_expense_exclusions;
DROP POLICY IF EXISTS "recurring_expense_exclusions_update_consolidated" ON public.recurring_expense_exclusions;
CREATE POLICY "recurring_expense_exclusions_update_consolidated" ON public.recurring_expense_exclusions
FOR UPDATE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND
  -- PROTECCIÓN CRÍTICA: Impedir modificaciones si período está bloqueado
  (payment_period_id IS NULL OR NOT is_payment_period_locked(payment_period_id))
) WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND
  (payment_period_id IS NULL OR NOT is_payment_period_locked(payment_period_id))
);

-- CONSOLIDAR DELETE: Combinar acceso + inmutabilidad
DROP POLICY IF EXISTS "recurring_expense_exclusions_delete_immutable_after_payment" ON public.recurring_expense_exclusions;
DROP POLICY IF EXISTS "recurring_expense_exclusions_delete_consolidated" ON public.recurring_expense_exclusions;
CREATE POLICY "recurring_expense_exclusions_delete_consolidated" ON public.recurring_expense_exclusions
FOR DELETE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND
  -- PROTECCIÓN CRÍTICA: Impedir eliminaciones si período está bloqueado
  (payment_period_id IS NULL OR NOT is_payment_period_locked(payment_period_id))
);

-- ================================
-- 3. COMENTARIOS DE OPTIMIZACIÓN
-- ================================

COMMENT ON POLICY "loads_archive_update_consolidated" ON public.loads_archive IS 
'Política consolidada: acceso de empresa + protección de períodos bloqueados para UPDATE';

COMMENT ON POLICY "loads_archive_delete_consolidated" ON public.loads_archive IS 
'Política consolidada: acceso de empresa + protección de períodos bloqueados para DELETE';

COMMENT ON POLICY "recurring_expense_exclusions_update_consolidated" ON public.recurring_expense_exclusions IS 
'Política consolidada: acceso autenticado + protección de períodos bloqueados para UPDATE';

COMMENT ON POLICY "recurring_expense_exclusions_delete_consolidated" ON public.recurring_expense_exclusions IS 
'Política consolidada: acceso autenticado + protección de períodos bloqueados para DELETE';