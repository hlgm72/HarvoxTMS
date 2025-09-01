-- ============================================================================
-- 🔒 ACTUALIZACIÓN DE POLÍTICAS RLS - TABLA FUEL_EXPENSES
-- ============================================================================

-- Verificar si la tabla fuel_expenses tiene las políticas que necesitamos actualizar
DO $$
BEGIN
  -- Actualizar fuel_expenses solo si existe
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fuel_expenses' AND table_schema = 'public') THEN
    
    -- Dropar políticas existentes si existen
    DROP POLICY IF EXISTS "fuel_expenses_update_immutable_after_payment" ON public.fuel_expenses;
    DROP POLICY IF EXISTS "fuel_expenses_delete_immutable_after_payment" ON public.fuel_expenses;
    
    -- Crear nuevas políticas (asumiendo que fuel_expenses tiene driver_user_id y payment_period_id)
    EXECUTE 'CREATE POLICY "fuel_expenses_update_protected_by_payment_status" 
    ON public.fuel_expenses FOR UPDATE
    USING (
      (SELECT auth.uid()) IS NOT NULL AND
      (SELECT auth.role()) = ''authenticated'' AND
      COALESCE(((SELECT auth.jwt())->>''is_anonymous'')::boolean, false) = false AND
      -- Solo admins pueden modificar fuel_expenses
      EXISTS (
        SELECT 1 FROM user_company_roles ucr
        JOIN company_payment_periods cpp ON ucr.company_id = cpp.company_id
        WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND
        ucr.role = ANY(ARRAY[''company_owner''::user_role, ''operations_manager''::user_role, ''superadmin''::user_role]) AND
        cpp.id = payment_period_id
      ) AND
      -- ⭐ NUEVA PROTECCIÓN: Verificar que el conductor no esté pagado
      NOT is_driver_paid_in_period(driver_user_id, payment_period_id)
    )
    WITH CHECK (
      (SELECT auth.uid()) IS NOT NULL AND
      (SELECT auth.role()) = ''authenticated'' AND
      COALESCE(((SELECT auth.jwt())->>''is_anonymous'')::boolean, false) = false AND
      EXISTS (
        SELECT 1 FROM user_company_roles ucr
        JOIN company_payment_periods cpp ON ucr.company_id = cpp.company_id
        WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND
        ucr.role = ANY(ARRAY[''company_owner''::user_role, ''operations_manager''::user_role, ''superadmin''::user_role]) AND
        cpp.id = payment_period_id
      ) AND
      NOT is_driver_paid_in_period(driver_user_id, payment_period_id)
    )';

    EXECUTE 'CREATE POLICY "fuel_expenses_delete_protected_by_payment_status" 
    ON public.fuel_expenses FOR DELETE
    USING (
      (SELECT auth.uid()) IS NOT NULL AND
      (SELECT auth.role()) = ''authenticated'' AND
      COALESCE(((SELECT auth.jwt())->>''is_anonymous'')::boolean, false) = false AND
      EXISTS (
        SELECT 1 FROM user_company_roles ucr
        JOIN company_payment_periods cpp ON ucr.company_id = cpp.company_id
        WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND
        ucr.role = ANY(ARRAY[''company_owner''::user_role, ''operations_manager''::user_role, ''superadmin''::user_role]) AND
        cpp.id = payment_period_id
      ) AND
      NOT is_driver_paid_in_period(driver_user_id, payment_period_id)
    )';
    
    RAISE NOTICE '✅ fuel_expenses policies updated successfully';
  ELSE
    RAISE NOTICE '⚠️ fuel_expenses table does not exist, skipping';
  END IF;
END $$;