-- Complete RLS optimization: Fix all remaining auth.uid() performance issues
-- Replace auth.uid() with (select auth.uid()) in all remaining policies

-- Optimize expense_instances policies
DROP POLICY IF EXISTS "Company members can view expense instances" ON public.expense_instances;
CREATE POLICY "Company members can view expense instances" 
ON public.expense_instances 
FOR SELECT 
USING (
  payment_period_id IN (
    SELECT pp.id
    FROM (payment_periods pp JOIN user_company_roles ucr ON ((pp.driver_user_id = ucr.user_id)))
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )
);

-- Optimize pending_expenses policies
DROP POLICY IF EXISTS "Company members can manage pending expenses" ON public.pending_expenses;
DROP POLICY IF EXISTS "Company members can view company pending expenses" ON public.pending_expenses;

CREATE POLICY "Company members can manage pending expenses" 
ON public.pending_expenses 
FOR ALL 
USING (
  driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )
);

CREATE POLICY "Company members can view company pending expenses" 
ON public.pending_expenses 
FOR SELECT 
USING (
  driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )
);

-- Optimize expense_template_history policies
DROP POLICY IF EXISTS "Company members can manage template history" ON public.expense_template_history;
DROP POLICY IF EXISTS "Company members can view template history" ON public.expense_template_history;

CREATE POLICY "Company members can manage template history" 
ON public.expense_template_history 
FOR ALL 
USING (
  template_id IN (
    SELECT ret.id
    FROM (recurring_expense_templates ret JOIN user_company_roles ucr ON ((ret.driver_user_id = ucr.user_id)))
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )
);

CREATE POLICY "Company members can view template history" 
ON public.expense_template_history 
FOR SELECT 
USING (
  template_id IN (
    SELECT ret.id
    FROM (recurring_expense_templates ret JOIN user_company_roles ucr ON ((ret.driver_user_id = ucr.user_id)))
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )
);

-- Optimize fuel_expenses policies
DROP POLICY IF EXISTS "Company members can manage fuel expenses" ON public.fuel_expenses;
DROP POLICY IF EXISTS "Company members can view company fuel expenses" ON public.fuel_expenses;

CREATE POLICY "Company members can manage fuel expenses" 
ON public.fuel_expenses 
FOR ALL 
USING (
  (driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )) AND 
  (NOT is_period_locked(payment_period_id))
);

CREATE POLICY "Company members can view company fuel expenses" 
ON public.fuel_expenses 
FOR SELECT 
USING (
  (NOT is_superadmin()) AND 
  (driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE (
          (user_company_roles.user_id = (select auth.uid())) AND 
          (user_company_roles.is_active = true) AND 
          (user_company_roles.company_id IN (
            SELECT get_real_companies.id
            FROM get_real_companies() get_real_companies(id)
          ))
        )
      ) AND 
      (ucr.is_active = true)
    )
  ))
);

-- Optimize fuel_limits policies
DROP POLICY IF EXISTS "Company members can manage fuel limits" ON public.fuel_limits;
DROP POLICY IF EXISTS "Company members can view company fuel limits" ON public.fuel_limits;

CREATE POLICY "Company members can manage fuel limits" 
ON public.fuel_limits 
FOR ALL 
USING (
  driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )
);

CREATE POLICY "Company members can view company fuel limits" 
ON public.fuel_limits 
FOR SELECT 
USING (
  driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )
);

-- Optimize other_income policies
DROP POLICY IF EXISTS "Company members can manage other income" ON public.other_income;
DROP POLICY IF EXISTS "Company members can view company other income" ON public.other_income;

CREATE POLICY "Company members can manage other income" 
ON public.other_income 
FOR ALL 
USING (
  (driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )) AND 
  (NOT is_period_locked(payment_period_id))
);

CREATE POLICY "Company members can view company other income" 
ON public.other_income 
FOR SELECT 
USING (
  driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )
);

-- Optimize payment_periods policies
DROP POLICY IF EXISTS "Company members can manage payment periods" ON public.payment_periods;
DROP POLICY IF EXISTS "Company members can view company payment periods" ON public.payment_periods;

CREATE POLICY "Company members can manage payment periods" 
ON public.payment_periods 
FOR ALL 
USING (
  driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )
);

CREATE POLICY "Company members can view company payment periods" 
ON public.payment_periods 
FOR SELECT 
USING (
  (NOT is_superadmin()) AND 
  (driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE (
          (user_company_roles.user_id = (select auth.uid())) AND 
          (user_company_roles.is_active = true) AND 
          (user_company_roles.company_id IN (
            SELECT get_real_companies.id
            FROM get_real_companies() get_real_companies(id)
          ))
        )
      ) AND 
      (ucr.is_active = true)
    )
  ))
);

-- Optimize payment_reports policies
DROP POLICY IF EXISTS "Company members can manage payment reports" ON public.payment_reports;
DROP POLICY IF EXISTS "Company members can view payment reports" ON public.payment_reports;

CREATE POLICY "Company members can manage payment reports" 
ON public.payment_reports 
FOR ALL 
USING (
  (payment_period_id IN (
    SELECT pp.id
    FROM (payment_periods pp JOIN user_company_roles ucr ON ((pp.driver_user_id = ucr.user_id)))
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )) AND 
  (NOT is_period_locked(payment_period_id))
);

CREATE POLICY "Company members can view payment reports" 
ON public.payment_reports 
FOR SELECT 
USING (
  payment_period_id IN (
    SELECT pp.id
    FROM (payment_periods pp JOIN user_company_roles ucr ON ((pp.driver_user_id = ucr.user_id)))
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )
);

-- Optimize loads policies
DROP POLICY IF EXISTS "Company members can manage company loads" ON public.loads;
DROP POLICY IF EXISTS "Company members can view company loads" ON public.loads;

CREATE POLICY "Company members can manage company loads" 
ON public.loads 
FOR ALL 
USING (
  driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )
);

CREATE POLICY "Company members can view company loads" 
ON public.loads 
FOR SELECT 
USING (
  (NOT is_superadmin()) AND 
  (driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE (
          (user_company_roles.user_id = (select auth.uid())) AND 
          (user_company_roles.is_active = true) AND 
          (user_company_roles.company_id IN (
            SELECT get_real_companies.id
            FROM get_real_companies() get_real_companies(id)
          ))
        )
      ) AND 
      (ucr.is_active = true)
    )
  ))
);

-- Log completion
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_optimization_complete', jsonb_build_object(
  'timestamp', now(),
  'tables_optimized', ARRAY['expense_instances', 'pending_expenses', 'expense_template_history', 'fuel_expenses', 'fuel_limits', 'other_income', 'payment_periods', 'payment_reports', 'loads'],
  'description', 'Complete RLS policy optimization - all auth.uid() performance issues resolved'
));