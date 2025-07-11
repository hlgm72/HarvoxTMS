-- Comprehensive RLS Performance Optimization
-- Replace auth.uid() and auth.role() with (SELECT auth.uid()) and (SELECT auth.role())
-- to prevent re-evaluation for each row

-- 1. Companies table
DROP POLICY IF EXISTS "Companies unified access policy" ON public.companies;
CREATE POLICY "Companies unified access policy" ON public.companies
FOR ALL
USING (
  is_superadmin((SELECT auth.uid())) 
  OR (id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  ))
)
WITH CHECK (is_superadmin((SELECT auth.uid())));

-- 2. User company roles table
DROP POLICY IF EXISTS "User company roles unified policy" ON public.user_company_roles;
CREATE POLICY "User company roles unified policy" ON public.user_company_roles
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    is_superadmin((SELECT auth.uid()))
    OR (SELECT auth.uid()) = user_id
    OR company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true 
      AND ucr.role IN ('company_owner', 'senior_dispatcher')
    )
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    is_superadmin((SELECT auth.uid()))
    OR (SELECT auth.uid()) = user_id
  ))
);

-- 3. Profiles table
DROP POLICY IF EXISTS "Profiles comprehensive access" ON public.profiles;
CREATE POLICY "Profiles comprehensive access" ON public.profiles
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = user_id)
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = user_id)
);

-- 4. State cities table
DROP POLICY IF EXISTS "State cities comprehensive access" ON public.state_cities;
CREATE POLICY "State cities comprehensive access" ON public.state_cities
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR true
)
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- 5. States table
DROP POLICY IF EXISTS "States comprehensive access" ON public.states;
CREATE POLICY "States comprehensive access" ON public.states
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR true
)
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- 6. System stats table
DROP POLICY IF EXISTS "System stats comprehensive access" ON public.system_stats;
CREATE POLICY "System stats comprehensive access" ON public.system_stats
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND is_superadmin((SELECT auth.uid())))
)
WITH CHECK ((SELECT auth.role()) = 'service_role');

-- 7. User invitations table
DROP POLICY IF EXISTS "User invitations complete access" ON public.user_invitations;
CREATE POLICY "User invitations complete access" ON public.user_invitations
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    is_superadmin((SELECT auth.uid()))
    OR email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
    OR company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true 
      AND ucr.role IN ('company_owner', 'senior_dispatcher')
    )
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    is_superadmin((SELECT auth.uid()))
    OR company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true 
      AND ucr.role IN ('company_owner', 'senior_dispatcher')
    )
  ))
);

-- 8. Fuel expenses table
DROP POLICY IF EXISTS "Fuel expenses complete policy" ON public.fuel_expenses;
CREATE POLICY "Fuel expenses complete policy" ON public.fuel_expenses
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    (SELECT auth.uid()) = driver_user_id
    OR ((NOT is_superadmin((SELECT auth.uid()))) AND driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE user_company_roles.user_id = (SELECT auth.uid()) 
        AND user_company_roles.is_active = true 
        AND user_company_roles.company_id IN (SELECT id FROM get_real_companies())
      ) AND ucr.is_active = true
    ))
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ) AND NOT is_period_locked(payment_period_id))
);

-- 9. Fuel limits table
DROP POLICY IF EXISTS "Fuel limits complete policy" ON public.fuel_limits;
CREATE POLICY "Fuel limits complete policy" ON public.fuel_limits
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    (SELECT auth.uid()) = driver_user_id
    OR driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE user_company_roles.user_id = (SELECT auth.uid()) 
        AND user_company_roles.is_active = true
      ) AND ucr.is_active = true
    )
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
);

-- 10. Expense instances table
DROP POLICY IF EXISTS "Expense instances complete policy" ON public.expense_instances;
CREATE POLICY "Expense instances complete policy" ON public.expense_instances
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND payment_period_id IN (
    SELECT pp.id
    FROM payment_periods pp
    JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND payment_period_id IN (
    SELECT pp.id
    FROM payment_periods pp
    JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ) AND NOT is_period_locked(payment_period_id))
);

-- 11. Expense template history table
DROP POLICY IF EXISTS "Expense template history complete policy" ON public.expense_template_history;
CREATE POLICY "Expense template history complete policy" ON public.expense_template_history
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND template_id IN (
    SELECT ret.id
    FROM recurring_expense_templates ret
    JOIN user_company_roles ucr ON ret.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND template_id IN (
    SELECT ret.id
    FROM recurring_expense_templates ret
    JOIN user_company_roles ucr ON ret.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
);

-- 12. Expense types table
DROP POLICY IF EXISTS "Expense types complete policy" ON public.expense_types;
CREATE POLICY "Expense types complete policy" ON public.expense_types
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR (SELECT auth.role()) = 'authenticated'
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND EXISTS (
    SELECT 1
    FROM user_company_roles
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  ))
);

-- 13. Recurring expense templates table
DROP POLICY IF EXISTS "Recurring expense templates complete policy" ON public.recurring_expense_templates;
CREATE POLICY "Recurring expense templates complete policy" ON public.recurring_expense_templates
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (SELECT auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
);

-- Log the comprehensive optimization
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_comprehensive_auth_optimization', jsonb_build_object(
  'timestamp', now(),
  'description', 'Comprehensive RLS optimization to prevent auth function re-evaluation',
  'tables_optimized', ARRAY[
    'companies', 'user_company_roles', 'profiles', 'state_cities', 'states', 
    'system_stats', 'user_invitations', 'fuel_expenses', 'fuel_limits',
    'expense_instances', 'expense_template_history', 'expense_types', 
    'recurring_expense_templates'
  ],
  'optimization', 'Replaced auth.uid() and auth.role() with (SELECT auth.uid()) and (SELECT auth.role())'
));