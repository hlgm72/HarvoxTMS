-- Continue comprehensive RLS policy consolidation for remaining tables

-- Other Income Table
DROP POLICY IF EXISTS "Company members can manage other income" ON public.other_income;
DROP POLICY IF EXISTS "Company members can view company other income" ON public.other_income;
DROP POLICY IF EXISTS "Users can view their own other income" ON public.other_income;
DROP POLICY IF EXISTS "Service role can manage other income" ON public.other_income;

CREATE POLICY "Other income comprehensive policy" ON public.other_income
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access their own data or company data
  (auth.role() = 'authenticated' AND (
    -- Users can view their own other income
    (select auth.uid()) = driver_user_id
    OR
    -- Company members can view other income in their company
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
  -- Authenticated users can manage within their company and unlocked periods
  (auth.role() = 'authenticated' AND 
    driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE user_company_roles.user_id = (select auth.uid()) 
        AND user_company_roles.is_active = true
      ) AND ucr.is_active = true
    ) AND NOT is_period_locked(payment_period_id)
  )
);

-- Payment Periods Table
DROP POLICY IF EXISTS "Company members can manage payment periods" ON public.payment_periods;
DROP POLICY IF EXISTS "Company members can view company payment periods" ON public.payment_periods;
DROP POLICY IF EXISTS "Users can view their own payment periods" ON public.payment_periods;
DROP POLICY IF EXISTS "Service role can manage payment periods" ON public.payment_periods;

CREATE POLICY "Payment periods comprehensive policy" ON public.payment_periods
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access their own data or company data
  (auth.role() = 'authenticated' AND (
    -- Users can view their own payment periods
    (select auth.uid()) = driver_user_id
    OR
    -- Company members can view payment periods in their company (excluding superadmin)
    (NOT is_superadmin() AND driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE user_company_roles.user_id = (select auth.uid()) 
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

-- Payment Reports Table
DROP POLICY IF EXISTS "Company members can manage payment reports" ON public.payment_reports;
DROP POLICY IF EXISTS "Company members can view payment reports" ON public.payment_reports;
DROP POLICY IF EXISTS "Service role can manage payment reports" ON public.payment_reports;

CREATE POLICY "Payment reports comprehensive policy" ON public.payment_reports
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access reports in their company
  (auth.role() = 'authenticated' AND payment_period_id IN (
    SELECT pp.id
    FROM payment_periods pp
    JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
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
  -- Authenticated users can manage within their company and unlocked periods
  (auth.role() = 'authenticated' AND 
    payment_period_id IN (
      SELECT pp.id
      FROM payment_periods pp
      JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
      WHERE ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE user_company_roles.user_id = (select auth.uid()) 
        AND user_company_roles.is_active = true
      ) AND ucr.is_active = true
    ) AND NOT is_period_locked(payment_period_id)
  )
);

-- Update statistics
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_policies_comprehensive_fix_2', jsonb_build_object(
  'timestamp', now(),
  'description', 'Comprehensive consolidation part 2 - other_income, payment_periods, payment_reports',
  'tables_fixed', ARRAY['other_income', 'payment_periods', 'payment_reports'],
  'approach', 'unified_policies_with_role_check'
));