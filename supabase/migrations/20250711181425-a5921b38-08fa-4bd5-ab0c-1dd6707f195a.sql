-- Carefully optimize remaining RLS policies to fix Auth RLS Initialization Plan warnings
-- Using the existing get_user_company_roles function to avoid recursion

-- 1. Load documents
DROP POLICY IF EXISTS "Load documents comprehensive policy" ON public.load_documents;
CREATE POLICY "Load documents comprehensive policy" ON public.load_documents
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND load_id IN (
    SELECT l.id
    FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    ) AND ucr.is_active = true
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND load_id IN (
    SELECT l.id
    FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    ) AND ucr.is_active = true
  ))
);

-- 2. Load stops
DROP POLICY IF EXISTS "Load stops comprehensive policy" ON public.load_stops;
CREATE POLICY "Load stops comprehensive policy" ON public.load_stops
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND load_id IN (
    SELECT l.id
    FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    ) AND ucr.is_active = true
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND load_id IN (
    SELECT l.id
    FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    ) AND ucr.is_active = true
  ))
);

-- 3. Loads
DROP POLICY IF EXISTS "Loads comprehensive policy" ON public.loads;
CREATE POLICY "Loads comprehensive policy" ON public.loads
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    (SELECT auth.uid()) = driver_user_id
    OR ((NOT is_superadmin((SELECT auth.uid()))) AND driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
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
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    ) AND ucr.is_active = true
  ))
);

-- 4. Other income
DROP POLICY IF EXISTS "Other income comprehensive policy" ON public.other_income;
CREATE POLICY "Other income comprehensive policy" ON public.other_income
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    (SELECT auth.uid()) = driver_user_id
    OR driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
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
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    ) AND ucr.is_active = true
  ) AND NOT is_period_locked(payment_period_id))
);

-- 5. Payment periods
DROP POLICY IF EXISTS "Payment periods comprehensive policy" ON public.payment_periods;
CREATE POLICY "Payment periods comprehensive policy" ON public.payment_periods
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    (SELECT auth.uid()) = driver_user_id
    OR ((NOT is_superadmin((SELECT auth.uid()))) AND driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
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
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    ) AND ucr.is_active = true
  ))
);

-- 6. Payment reports
DROP POLICY IF EXISTS "Payment reports comprehensive policy" ON public.payment_reports;
CREATE POLICY "Payment reports comprehensive policy" ON public.payment_reports
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND payment_period_id IN (
    SELECT pp.id
    FROM payment_periods pp
    JOIN user_company_roles ucr ON pp.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
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
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    ) AND ucr.is_active = true
  ) AND NOT is_period_locked(payment_period_id))
);

-- 7. Pending expenses
DROP POLICY IF EXISTS "Pending expenses comprehensive policy" ON public.pending_expenses;
CREATE POLICY "Pending expenses comprehensive policy" ON public.pending_expenses
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    (SELECT auth.uid()) = driver_user_id
    OR driver_user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
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
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    ) AND ucr.is_active = true
  ))
);

-- 8. Payment methods
DROP POLICY IF EXISTS "Payment methods comprehensive policy" ON public.payment_methods;
CREATE POLICY "Payment methods comprehensive policy" ON public.payment_methods
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND company_id IN (
    SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND company_id IN (
    SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    WHERE role IN ('company_owner', 'senior_dispatcher')
  ))
);

-- 9. Company broker dispatchers
DROP POLICY IF EXISTS "Company broker dispatchers complete policy" ON public.company_broker_dispatchers;
CREATE POLICY "Company broker dispatchers complete policy" ON public.company_broker_dispatchers
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND broker_id IN (
    SELECT cb.id
    FROM company_brokers cb
    WHERE cb.company_id IN (
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    )
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND broker_id IN (
    SELECT cb.id
    FROM company_brokers cb
    WHERE cb.company_id IN (
      SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
    )
  ))
);

-- 10. Company brokers
DROP POLICY IF EXISTS "Company brokers complete policy" ON public.company_brokers;
CREATE POLICY "Company brokers complete policy" ON public.company_brokers
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (NOT is_superadmin((SELECT auth.uid()))) AND company_id IN (
    SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND company_id IN (
    SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
  ))
);

-- 11. Company documents
DROP POLICY IF EXISTS "Company documents complete policy" ON public.company_documents;
CREATE POLICY "Company documents complete policy" ON public.company_documents
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND company_id IN (
    SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND company_id IN (
    SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
  ))
);

-- 12. Company drivers
DROP POLICY IF EXISTS "Company drivers complete policy" ON public.company_drivers;
CREATE POLICY "Company drivers complete policy" ON public.company_drivers
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    (SELECT auth.uid()) = user_id
    OR ((NOT is_superadmin((SELECT auth.uid()))) AND user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
      ) AND ucr.is_active = true
    ))
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = user_id)
);

-- 13. Driver profiles
DROP POLICY IF EXISTS "Driver profiles complete policy" ON public.driver_profiles;
CREATE POLICY "Driver profiles complete policy" ON public.driver_profiles
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    (SELECT auth.uid()) = user_id
    OR ((NOT is_superadmin((SELECT auth.uid()))) AND user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
      ) AND ucr.is_active = true
    ))
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = user_id)
);

-- 14. Owner operators
DROP POLICY IF EXISTS "Owner operators complete policy" ON public.owner_operators;
CREATE POLICY "Owner operators complete policy" ON public.owner_operators
FOR ALL
USING (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (
    (SELECT auth.uid()) = user_id
    OR user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
      ) AND ucr.is_active = true
    )
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'
  OR ((SELECT auth.role()) = 'authenticated' AND (SELECT auth.uid()) = user_id)
);

-- Log the final optimization
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_final_auth_optimization', jsonb_build_object(
  'timestamp', now(),
  'description', 'Final RLS optimization to resolve all Auth RLS Initialization Plan warnings',
  'tables_optimized', ARRAY[
    'load_documents', 'load_stops', 'loads', 'other_income', 'payment_periods',
    'payment_reports', 'pending_expenses', 'payment_methods', 'company_broker_dispatchers',
    'company_brokers', 'company_documents', 'company_drivers', 'driver_profiles', 'owner_operators'
  ],
  'optimization', 'Used get_user_company_roles function and (SELECT auth.uid()/(SELECT auth.role()) to prevent re-evaluation'
));