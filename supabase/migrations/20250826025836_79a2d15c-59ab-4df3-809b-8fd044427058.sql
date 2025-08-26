-- Optimize RLS policies to prevent auth function re-evaluation for each row
-- This improves performance by using (select auth.function()) instead of auth.function()

-- Fix loads table RLS policies
DROP POLICY IF EXISTS "loads_select_access" ON public.loads;
CREATE POLICY "loads_select_access" ON public.loads
FOR SELECT USING (
  (SELECT auth.role()) = 'authenticated'::text AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  (
    driver_user_id = (SELECT auth.uid()) OR 
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "loads_insert_access" ON public.loads;
CREATE POLICY "loads_insert_access" ON public.loads
FOR INSERT WITH CHECK (
  (SELECT auth.role()) = 'authenticated'::text AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
  )
);

DROP POLICY IF EXISTS "loads_update_immutable_after_payment" ON public.loads;
CREATE POLICY "loads_update_immutable_after_payment" ON public.loads
FOR UPDATE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) AND 
          NOT cpp.is_locked
  )
) WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) AND 
          NOT cpp.is_locked
  )
);

DROP POLICY IF EXISTS "loads_delete_immutable_after_payment" ON public.loads;
CREATE POLICY "loads_delete_immutable_after_payment" ON public.loads
FOR DELETE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) AND 
          NOT cpp.is_locked
  )
);

-- Fix expense_instances table RLS policies
DROP POLICY IF EXISTS "expense_instances_insert_access" ON public.expense_instances;
CREATE POLICY "expense_instances_insert_access" ON public.expense_instances
FOR INSERT WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  payment_period_id IN (
    SELECT dpc.id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
  )
);

DROP POLICY IF EXISTS "expense_instances_update_immutable_after_payment" ON public.expense_instances;
CREATE POLICY "expense_instances_update_immutable_after_payment" ON public.expense_instances
FOR UPDATE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  payment_period_id IN (
    SELECT dpc.id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) AND 
          NOT cpp.is_locked
  )
) WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  payment_period_id IN (
    SELECT dpc.id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) AND 
          NOT cpp.is_locked
  )
);

DROP POLICY IF EXISTS "expense_instances_delete_immutable_after_payment" ON public.expense_instances;
CREATE POLICY "expense_instances_delete_immutable_after_payment" ON public.expense_instances
FOR DELETE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT auth.role()) = 'authenticated'::text AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  payment_period_id IN (
    SELECT dpc.id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) AND 
          NOT cpp.is_locked
  )
);

-- Fix driver_period_calculations table RLS policy
DROP POLICY IF EXISTS "driver_period_calculations_update_secure" ON public.driver_period_calculations;
CREATE POLICY "driver_period_calculations_update_secure" ON public.driver_period_calculations
FOR UPDATE USING (
  (SELECT auth.role()) = 'authenticated'::text AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  company_payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
  )
) WITH CHECK (
  (SELECT auth.role()) = 'authenticated'::text AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false) = false AND 
  company_payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND 
          ucr.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
  )
);