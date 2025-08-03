-- Fix overlapping policies by creating specific policies for each operation
-- Remove FOR ALL policies and create specific INSERT/UPDATE/DELETE policies

-- 1. Fix company_payment_periods
DROP POLICY IF EXISTS "company_payment_periods_admin_policy" ON public.company_payment_periods;

CREATE POLICY "company_payment_periods_insert_policy" 
ON public.company_payment_periods 
FOR INSERT 
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    is_user_admin_in_company_safe((SELECT auth.uid()), company_id) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);

CREATE POLICY "company_payment_periods_update_policy" 
ON public.company_payment_periods 
FOR UPDATE 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    is_user_admin_in_company_safe((SELECT auth.uid()), company_id) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    is_user_admin_in_company_safe((SELECT auth.uid()), company_id) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);

CREATE POLICY "company_payment_periods_delete_policy" 
ON public.company_payment_periods 
FOR DELETE 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    is_user_admin_in_company_safe((SELECT auth.uid()), company_id) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);

-- 2. Fix dispatcher_other_income
DROP POLICY IF EXISTS "dispatcher_other_income_admin_policy" ON public.dispatcher_other_income;

CREATE POLICY "dispatcher_other_income_insert_policy" 
ON public.dispatcher_other_income 
FOR INSERT 
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    is_user_admin_in_company_safe((SELECT auth.uid()), company_id) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);

CREATE POLICY "dispatcher_other_income_update_policy" 
ON public.dispatcher_other_income 
FOR UPDATE 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    is_user_admin_in_company_safe((SELECT auth.uid()), company_id) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    is_user_admin_in_company_safe((SELECT auth.uid()), company_id) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);

CREATE POLICY "dispatcher_other_income_delete_policy" 
ON public.dispatcher_other_income 
FOR DELETE 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    is_user_admin_in_company_safe((SELECT auth.uid()), company_id) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);

-- 3. Fix expense_types  
DROP POLICY IF EXISTS "expense_types_admin_policy" ON public.expense_types;

CREATE POLICY "expense_types_insert_policy" 
ON public.expense_types 
FOR INSERT 
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND is_user_superadmin_safe((SELECT auth.uid()))
);

CREATE POLICY "expense_types_update_policy" 
ON public.expense_types 
FOR UPDATE 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND is_user_superadmin_safe((SELECT auth.uid()))
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND is_user_superadmin_safe((SELECT auth.uid()))
);

CREATE POLICY "expense_types_delete_policy" 
ON public.expense_types 
FOR DELETE 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND is_user_superadmin_safe((SELECT auth.uid()))
);

-- 4. Fix recurring_expense_templates
DROP POLICY IF EXISTS "recurring_expense_templates_admin_policy" ON public.recurring_expense_templates;

CREATE POLICY "recurring_expense_templates_insert_policy" 
ON public.recurring_expense_templates 
FOR INSERT 
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    driver_user_id IN (
      SELECT ucr.user_id 
      FROM user_company_roles ucr 
      WHERE ucr.company_id = ANY(get_user_company_ids_safe((SELECT auth.uid())))
      AND ucr.is_active = true
      AND ucr.company_id IN (
        SELECT ucr2.company_id 
        FROM user_company_roles ucr2 
        WHERE ucr2.user_id = (SELECT auth.uid()) 
        AND ucr2.role IN ('company_owner', 'operations_manager') 
        AND ucr2.is_active = true
      )
    )
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);

CREATE POLICY "recurring_expense_templates_update_policy" 
ON public.recurring_expense_templates 
FOR UPDATE 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    driver_user_id IN (
      SELECT ucr.user_id 
      FROM user_company_roles ucr 
      WHERE ucr.company_id = ANY(get_user_company_ids_safe((SELECT auth.uid())))
      AND ucr.is_active = true
      AND ucr.company_id IN (
        SELECT ucr2.company_id 
        FROM user_company_roles ucr2 
        WHERE ucr2.user_id = (SELECT auth.uid()) 
        AND ucr2.role IN ('company_owner', 'operations_manager') 
        AND ucr2.is_active = true
      )
    )
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    driver_user_id IN (
      SELECT ucr.user_id 
      FROM user_company_roles ucr 
      WHERE ucr.company_id = ANY(get_user_company_ids_safe((SELECT auth.uid())))
      AND ucr.is_active = true
      AND ucr.company_id IN (
        SELECT ucr2.company_id 
        FROM user_company_roles ucr2 
        WHERE ucr2.user_id = (SELECT auth.uid()) 
        AND ucr2.role IN ('company_owner', 'operations_manager') 
        AND ucr2.is_active = true
      )
    )
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);

CREATE POLICY "recurring_expense_templates_delete_policy" 
ON public.recurring_expense_templates 
FOR DELETE 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    driver_user_id IN (
      SELECT ucr.user_id 
      FROM user_company_roles ucr 
      WHERE ucr.company_id = ANY(get_user_company_ids_safe((SELECT auth.uid())))
      AND ucr.is_active = true
      AND ucr.company_id IN (
        SELECT ucr2.company_id 
        FROM user_company_roles ucr2 
        WHERE ucr2.user_id = (SELECT auth.uid()) 
        AND ucr2.role IN ('company_owner', 'operations_manager') 
        AND ucr2.is_active = true
      )
    )
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);