-- Final comprehensive RLS policies cleanup migration
-- Fixes all remaining multiple permissive policies warnings

-- 1. Fix fuel_expenses table
DROP POLICY IF EXISTS "Fuel expenses unified policy" ON public.fuel_expenses;
DROP POLICY IF EXISTS "Service role can manage fuel expenses" ON public.fuel_expenses;

CREATE POLICY "Fuel expenses complete policy" ON public.fuel_expenses
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access their own or company fuel expenses
  (auth.role() = 'authenticated' AND (
    auth.uid() = driver_user_id
    OR
    (NOT is_superadmin() AND driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE user_company_roles.user_id = auth.uid() 
        AND user_company_roles.is_active = true 
        AND user_company_roles.company_id IN (SELECT id FROM get_real_companies())
      ) AND ucr.is_active = true
    ))
  ))
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can manage fuel expenses in their company (if not locked)
  (auth.role() = 'authenticated' AND 
   driver_user_id IN (
     SELECT ucr.user_id
     FROM user_company_roles ucr
     WHERE ucr.company_id IN (
       SELECT user_company_roles.company_id
       FROM user_company_roles
       WHERE user_company_roles.user_id = auth.uid() AND user_company_roles.is_active = true
     ) AND ucr.is_active = true
   ) AND NOT is_period_locked(payment_period_id))
);

-- 2. Fix fuel_limits table
DROP POLICY IF EXISTS "Fuel limits unified policy" ON public.fuel_limits;
DROP POLICY IF EXISTS "Service role can manage fuel limits" ON public.fuel_limits;

CREATE POLICY "Fuel limits complete policy" ON public.fuel_limits
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access their own or company fuel limits
  (auth.role() = 'authenticated' AND (
    auth.uid() = driver_user_id
    OR
    driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE user_company_roles.user_id = auth.uid() AND user_company_roles.is_active = true
      ) AND ucr.is_active = true
    )
  ))
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can manage fuel limits in their company
  (auth.role() = 'authenticated' AND driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = auth.uid() AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
);

-- 3. Fix expense_instances table
DROP POLICY IF EXISTS "Expense instances unified policy" ON public.expense_instances;
DROP POLICY IF EXISTS "Service role can manage expense instances" ON public.expense_instances;

CREATE POLICY "Expense instances complete policy" ON public.expense_instances
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access expense instances from their company
  (auth.role() = 'authenticated' AND payment_period_id IN (
    SELECT pp.id
    FROM payment_periods pp
    JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = auth.uid() AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can manage expense instances in their company (if not locked)
  (auth.role() = 'authenticated' AND 
   payment_period_id IN (
     SELECT pp.id
     FROM payment_periods pp
     JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
     WHERE ucr.company_id IN (
       SELECT user_company_roles.company_id
       FROM user_company_roles
       WHERE user_company_roles.user_id = auth.uid() AND user_company_roles.is_active = true
     ) AND ucr.is_active = true
   ) AND NOT is_period_locked(payment_period_id))
);

-- 4. Fix expense_template_history table
DROP POLICY IF EXISTS "Expense template history unified policy" ON public.expense_template_history;
DROP POLICY IF EXISTS "Service role can manage template history" ON public.expense_template_history;

CREATE POLICY "Expense template history complete policy" ON public.expense_template_history
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access template history from their company
  (auth.role() = 'authenticated' AND template_id IN (
    SELECT ret.id
    FROM recurring_expense_templates ret
    JOIN user_company_roles ucr ON ret.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = auth.uid() AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can manage template history in their company
  (auth.role() = 'authenticated' AND template_id IN (
    SELECT ret.id
    FROM recurring_expense_templates ret
    JOIN user_company_roles ucr ON ret.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = auth.uid() AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
);

-- 5. Fix expense_types table
DROP POLICY IF EXISTS "Expense types unified policy" ON public.expense_types;
DROP POLICY IF EXISTS "Service role can manage expense types" ON public.expense_types;

CREATE POLICY "Expense types complete policy" ON public.expense_types
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- All authenticated users can view expense types
  auth.role() = 'authenticated'
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Only authenticated users with company roles can manage expense types
  (auth.role() = 'authenticated' AND EXISTS (
    SELECT 1
    FROM user_company_roles
    WHERE user_id = auth.uid() AND is_active = true
  ))
);

-- 6. Fix recurring_expense_templates table
DROP POLICY IF EXISTS "Recurring expense templates comprehensive policy" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "Company members can view company expense templates" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "Users can view their own expense templates" ON public.recurring_expense_templates;

CREATE POLICY "Recurring expense templates complete policy" ON public.recurring_expense_templates
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access templates from their company
  (auth.role() = 'authenticated' AND driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = auth.uid() AND user_company_roles.is_active = true
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
      WHERE user_company_roles.user_id = auth.uid() AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
);

-- Update statistics to track this final cleanup
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_policies_comprehensive_cleanup_complete', jsonb_build_object(
  'timestamp', now(),
  'description', 'Comprehensive cleanup of all multiple permissive RLS policies',
  'tables_fixed', ARRAY['fuel_expenses', 'fuel_limits', 'expense_instances', 'expense_template_history', 'expense_types', 'recurring_expense_templates'],
  'approach', 'single_comprehensive_policies_per_table',
  'all_multiple_permissive_warnings_resolved', true,
  'migration_phase', 'final'
));