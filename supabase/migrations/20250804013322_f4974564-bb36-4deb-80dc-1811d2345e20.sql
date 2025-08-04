-- Optimize RLS policies to prevent re-evaluation of auth functions for each row
-- Replace auth.function() with (select auth.function()) for better performance

-- Update expense_recurring_templates policies for optimal performance
DROP POLICY IF EXISTS "expense_recurring_templates_select_final" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_insert_final" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_update_final" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_delete_final" ON public.expense_recurring_templates;

CREATE POLICY "expense_recurring_templates_select_final" ON public.expense_recurring_templates
FOR SELECT TO authenticated USING (
  (select auth.role()) = 'authenticated' AND
  (select auth.uid()) IS NOT NULL AND 
  COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false) = false AND (
    user_id = (select auth.uid()) 
    OR user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (select auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

CREATE POLICY "expense_recurring_templates_insert_final" ON public.expense_recurring_templates
FOR INSERT TO authenticated WITH CHECK (
  (select auth.role()) = 'authenticated' AND
  (select auth.uid()) IS NOT NULL AND 
  COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false) = false AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (select auth.uid()) 
        AND ucr2.is_active = true 
        AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) 
    OR EXISTS (
      SELECT 1 FROM user_company_roles 
      WHERE user_id = (select auth.uid()) 
      AND role = 'superadmin' 
      AND is_active = true
    )
  )
);

CREATE POLICY "expense_recurring_templates_update_final" ON public.expense_recurring_templates
FOR UPDATE TO authenticated USING (
  (select auth.role()) = 'authenticated' AND
  (select auth.uid()) IS NOT NULL AND 
  COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false) = false AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (select auth.uid()) 
        AND ucr2.is_active = true 
        AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) 
    OR EXISTS (
      SELECT 1 FROM user_company_roles 
      WHERE user_id = (select auth.uid()) 
      AND role = 'superadmin' 
      AND is_active = true
    )
  )
) WITH CHECK (
  (select auth.role()) = 'authenticated' AND
  (select auth.uid()) IS NOT NULL AND 
  COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false) = false AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (select auth.uid()) 
        AND ucr2.is_active = true 
        AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) 
    OR EXISTS (
      SELECT 1 FROM user_company_roles 
      WHERE user_id = (select auth.uid()) 
      AND role = 'superadmin' 
      AND is_active = true
    )
  )
);

CREATE POLICY "expense_recurring_templates_delete_final" ON public.expense_recurring_templates
FOR DELETE TO authenticated USING (
  (select auth.role()) = 'authenticated' AND
  (select auth.uid()) IS NOT NULL AND 
  COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false) = false AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (select auth.uid()) 
        AND ucr2.is_active = true 
        AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) 
    OR EXISTS (
      SELECT 1 FROM user_company_roles 
      WHERE user_id = (select auth.uid()) 
      AND role = 'superadmin' 
      AND is_active = true
    )
  )
);

-- Update other_income policies for optimal performance
DROP POLICY IF EXISTS "other_income_select" ON public.other_income;
DROP POLICY IF EXISTS "other_income_insert" ON public.other_income;
DROP POLICY IF EXISTS "other_income_update" ON public.other_income;
DROP POLICY IF EXISTS "other_income_delete" ON public.other_income;

CREATE POLICY "other_income_select" ON public.other_income
FOR SELECT TO authenticated USING (
  (select auth.role()) = 'authenticated' AND
  (select auth.uid()) IS NOT NULL AND 
  COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false) = false AND (
    user_id = (select auth.uid()) 
    OR payment_period_id IN (
      SELECT dpc.id
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
    )
  )
);

CREATE POLICY "other_income_insert" ON public.other_income
FOR INSERT TO authenticated WITH CHECK (
  (select auth.role()) = 'authenticated' AND
  (select auth.uid()) IS NOT NULL AND 
  COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false) = false AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (select auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

CREATE POLICY "other_income_update" ON public.other_income
FOR UPDATE TO authenticated USING (
  (select auth.role()) = 'authenticated' AND
  (select auth.uid()) IS NOT NULL AND 
  COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false) = false AND (
    payment_period_id IN (
      SELECT dpc.id
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (select auth.uid()) 
      AND ucr.is_active = true 
      AND NOT cpp.is_locked
    )
  )
) WITH CHECK (
  (select auth.role()) = 'authenticated' AND
  (select auth.uid()) IS NOT NULL AND 
  COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false) = false AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (select auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

CREATE POLICY "other_income_delete" ON public.other_income
FOR DELETE TO authenticated USING (
  (select auth.role()) = 'authenticated' AND
  (select auth.uid()) IS NOT NULL AND 
  COALESCE(((select auth.jwt())->>'is_anonymous')::boolean, false) = false AND (
    payment_period_id IN (
      SELECT dpc.id
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (select auth.uid()) 
      AND ucr.is_active = true 
      AND NOT cpp.is_locked
    )
  )
);