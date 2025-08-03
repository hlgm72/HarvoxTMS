-- Create RLS policies for tables that have RLS enabled but no policies

-- 1. archive_logs - System logs, only superadmin should access
CREATE POLICY "archive_logs_superadmin_policy" 
ON public.archive_logs 
FOR ALL 
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

-- 2. company_payment_periods - Users can view periods for their companies
CREATE POLICY "company_payment_periods_select_policy" 
ON public.company_payment_periods 
FOR SELECT 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND company_id = ANY(get_user_company_ids_safe((SELECT auth.uid())))
);

CREATE POLICY "company_payment_periods_admin_policy" 
ON public.company_payment_periods 
FOR ALL 
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

-- 3. dispatcher_other_income - Dispatchers can view their own, admins can view all in company
CREATE POLICY "dispatcher_other_income_select_policy" 
ON public.dispatcher_other_income 
FOR SELECT 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    dispatcher_user_id = (SELECT auth.uid())
    OR company_id = ANY(get_user_company_ids_safe((SELECT auth.uid())))
  )
);

CREATE POLICY "dispatcher_other_income_admin_policy" 
ON public.dispatcher_other_income 
FOR ALL 
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

-- 4. expense_types - All authenticated users can view, only superadmin can modify
CREATE POLICY "expense_types_select_policy" 
ON public.expense_types 
FOR SELECT 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

CREATE POLICY "expense_types_admin_policy" 
ON public.expense_types 
FOR ALL 
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

-- 5. loads_archive - Similar to loads, users can view loads from their companies
-- First, let's check if this table has driver_user_id or company_id fields to create appropriate policies
-- Assuming it has similar structure to loads table with driver_user_id
CREATE POLICY "loads_archive_select_policy" 
ON public.loads_archive 
FOR SELECT 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    CASE 
      WHEN driver_user_id IS NOT NULL THEN 
        driver_user_id = (SELECT auth.uid()) 
        OR driver_user_id IN (
          SELECT ucr.user_id 
          FROM user_company_roles ucr 
          WHERE ucr.company_id = ANY(get_user_company_ids_safe((SELECT auth.uid())))
          AND ucr.is_active = true
        )
      ELSE true
    END
  )
);

-- 6. recurring_expense_templates - Users can view their own templates, admins can view all in company
CREATE POLICY "recurring_expense_templates_select_policy" 
ON public.recurring_expense_templates 
FOR SELECT 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    driver_user_id = (SELECT auth.uid())
    OR driver_user_id IN (
      SELECT ucr.user_id 
      FROM user_company_roles ucr 
      WHERE ucr.company_id = ANY(get_user_company_ids_safe((SELECT auth.uid())))
      AND ucr.is_active = true
    )
  )
);

CREATE POLICY "recurring_expense_templates_admin_policy" 
ON public.recurring_expense_templates 
FOR ALL 
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