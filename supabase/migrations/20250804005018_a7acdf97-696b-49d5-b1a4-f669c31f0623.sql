-- Arreglar problemas de rendimiento en RLS policies
-- 1. Primero eliminar políticas duplicadas de expense_recurring_templates
DROP POLICY IF EXISTS "Users can delete recurring_expense_templates for their company" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "Users can insert recurring_expense_templates for their company" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "Users can update recurring_expense_templates for their company" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "Users can view recurring_expense_templates for their company" ON public.expense_recurring_templates;

-- 2. Optimizar políticas de other_income (envolver auth.uid() en SELECT)
DROP POLICY IF EXISTS "other_income_select" ON public.other_income;
DROP POLICY IF EXISTS "other_income_insert" ON public.other_income;
DROP POLICY IF EXISTS "other_income_update" ON public.other_income;
DROP POLICY IF EXISTS "other_income_delete" ON public.other_income;

-- 3. Recrear políticas optimizadas para other_income
CREATE POLICY "other_income_select_optimized" ON public.other_income
FOR SELECT USING (
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  (
    -- Los usuarios pueden ver sus propios ingresos
    user_id = (SELECT auth.uid()) OR
    -- Los administradores de la empresa pueden ver todos los ingresos de su empresa
    payment_period_id IN (
      SELECT dpc.id 
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
);

CREATE POLICY "other_income_insert_optimized" ON public.other_income
FOR INSERT WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  (
    -- Los usuarios pueden crear sus propios ingresos
    user_id = (SELECT auth.uid()) OR
    -- Los administradores pueden crear ingresos para usuarios de su empresa
    payment_period_id IN (
      SELECT dpc.id 
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
);

CREATE POLICY "other_income_update_optimized" ON public.other_income
FOR UPDATE USING (
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  payment_period_id IN (
    SELECT dpc.id 
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
) WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  payment_period_id IN (
    SELECT dpc.id 
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

CREATE POLICY "other_income_delete_optimized" ON public.other_income
FOR DELETE USING (
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  payment_period_id IN (
    SELECT dpc.id 
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- 4. Optimizar políticas de expense_recurring_templates (solo mantener las optimizadas)
CREATE POLICY "expense_recurring_templates_select_optimized" ON public.expense_recurring_templates
FOR SELECT USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false AND 
  (
    user_id = (SELECT auth.uid()) OR 
    user_id IN ( 
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN ( 
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

CREATE POLICY "expense_recurring_templates_insert_optimized" ON public.expense_recurring_templates
FOR INSERT WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false AND 
  (
    user_id IN ( 
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN ( 
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true AND ucr2.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);

CREATE POLICY "expense_recurring_templates_update_optimized" ON public.expense_recurring_templates
FOR UPDATE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false AND 
  (
    user_id IN ( 
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN ( 
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true AND ucr2.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) OR is_user_superadmin_safe((SELECT auth.uid()))
  )
) WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false AND 
  (
    user_id IN ( 
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN ( 
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true AND ucr2.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);

CREATE POLICY "expense_recurring_templates_delete_optimized" ON public.expense_recurring_templates
FOR DELETE USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false AND 
  (
    user_id IN ( 
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN ( 
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true AND ucr2.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);