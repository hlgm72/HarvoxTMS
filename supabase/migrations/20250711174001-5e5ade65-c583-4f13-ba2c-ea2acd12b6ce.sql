-- Final comprehensive RLS policy consolidation for all remaining tables

-- Pending Expenses Table
DROP POLICY IF EXISTS "Company members can manage pending expenses" ON public.pending_expenses;
DROP POLICY IF EXISTS "Company members can view company pending expenses" ON public.pending_expenses;
DROP POLICY IF EXISTS "Users can view their own pending expenses" ON public.pending_expenses;
DROP POLICY IF EXISTS "Service role can manage pending expenses" ON public.pending_expenses;

CREATE POLICY "Pending expenses comprehensive policy" ON public.pending_expenses
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access their own data or company data
  (auth.role() = 'authenticated' AND (
    -- Users can view their own pending expenses
    (select auth.uid()) = driver_user_id
    OR
    -- Company members can view pending expenses in their company
    driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE user_company_roles.user_id = (select auth.uid()) 
        AND user_company_roles.is_active = true
      ) AND ucr.is_active = true
    )
  ))
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can manage within their company
  (auth.role() = 'authenticated' AND driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
);

-- Recurring Expense Templates Table
DROP POLICY IF EXISTS "Company members can manage expense templates" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "Company members can view expense templates" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "Service role can manage expense templates" ON public.recurring_expense_templates;

CREATE POLICY "Recurring expense templates comprehensive policy" ON public.recurring_expense_templates
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access templates in their company
  (auth.role() = 'authenticated' AND driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can manage templates in their company
  (auth.role() = 'authenticated' AND driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
);

-- Payment Methods Table
DROP POLICY IF EXISTS "Company members can view payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Company owners can manage payment methods" ON public.payment_methods;
DROP POLICY IF EXISTS "Service role can manage payment methods" ON public.payment_methods;

CREATE POLICY "Payment methods comprehensive policy" ON public.payment_methods
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can view payment methods in their company
  (auth.role() = 'authenticated' AND company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
  ))
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Only company owners/senior dispatchers can manage payment methods
  (auth.role() = 'authenticated' AND company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) 
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'senior_dispatcher'::user_role]) 
    AND ucr.is_active = true
  ))
);

-- Update final statistics
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_policies_comprehensive_fix_final', jsonb_build_object(
  'timestamp', now(),
  'description', 'Final comprehensive consolidation of ALL multiple permissive RLS policies',
  'tables_fixed', ARRAY['pending_expenses', 'recurring_expense_templates', 'payment_methods'],
  'approach', 'unified_policies_with_role_check',
  'total_optimization_complete', true,
  'all_warnings_should_be_resolved', true
));