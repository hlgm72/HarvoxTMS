-- Final RLS optimization: Fix remaining auth.uid() performance issues
-- Replace auth.uid() with (select auth.uid()) in remaining policies

-- Drop and recreate company_drivers policies
DROP POLICY IF EXISTS "Company members can view company driver profiles" ON public.company_drivers;
CREATE POLICY "Company members can view company driver profiles" 
ON public.company_drivers 
FOR SELECT 
USING (
  (NOT is_superadmin()) AND 
  (user_id IN (
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

-- Drop and recreate company_broker_dispatchers policies
DROP POLICY IF EXISTS "Company members can delete broker dispatchers" ON public.company_broker_dispatchers;
DROP POLICY IF EXISTS "Company members can insert broker dispatchers" ON public.company_broker_dispatchers;
DROP POLICY IF EXISTS "Company members can update broker dispatchers" ON public.company_broker_dispatchers;
DROP POLICY IF EXISTS "Company members can view broker dispatchers" ON public.company_broker_dispatchers;

CREATE POLICY "Company members can delete broker dispatchers" 
ON public.company_broker_dispatchers 
FOR DELETE 
USING (
  broker_id IN (
    SELECT cb.id
    FROM (company_brokers cb JOIN user_company_roles ucr ON ((cb.company_id = ucr.company_id)))
    WHERE ((ucr.user_id = (select auth.uid())) AND (ucr.is_active = true))
  )
);

CREATE POLICY "Company members can insert broker dispatchers" 
ON public.company_broker_dispatchers 
FOR INSERT 
WITH CHECK (
  broker_id IN (
    SELECT cb.id
    FROM (company_brokers cb JOIN user_company_roles ucr ON ((cb.company_id = ucr.company_id)))
    WHERE ((ucr.user_id = (select auth.uid())) AND (ucr.is_active = true))
  )
);

CREATE POLICY "Company members can update broker dispatchers" 
ON public.company_broker_dispatchers 
FOR UPDATE 
USING (
  broker_id IN (
    SELECT cb.id
    FROM (company_brokers cb JOIN user_company_roles ucr ON ((cb.company_id = ucr.company_id)))
    WHERE ((ucr.user_id = (select auth.uid())) AND (ucr.is_active = true))
  )
);

CREATE POLICY "Company members can view broker dispatchers" 
ON public.company_broker_dispatchers 
FOR SELECT 
USING (
  broker_id IN (
    SELECT cb.id
    FROM (company_brokers cb JOIN user_company_roles ucr ON ((cb.company_id = ucr.company_id)))
    WHERE ((ucr.user_id = (select auth.uid())) AND (ucr.is_active = true))
  )
);

-- Drop and recreate expense_types policies
DROP POLICY IF EXISTS "Company members can manage expense types" ON public.expense_types;
CREATE POLICY "Company members can manage expense types" 
ON public.expense_types 
FOR ALL 
USING (
  EXISTS (
    SELECT 1
    FROM user_company_roles
    WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
  )
);

-- Drop and recreate recurring_expense_templates policies
DROP POLICY IF EXISTS "Company members can manage expense templates" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "Company members can view company expense templates" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "Users can view their own expense templates" ON public.recurring_expense_templates;

CREATE POLICY "Company members can manage expense templates" 
ON public.recurring_expense_templates 
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

CREATE POLICY "Company members can view company expense templates" 
ON public.recurring_expense_templates 
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

CREATE POLICY "Users can view their own expense templates" 
ON public.recurring_expense_templates 
FOR SELECT 
USING ((select auth.uid()) = driver_user_id);

-- Drop and recreate expense_instances policies
DROP POLICY IF EXISTS "Company members can manage expense instances" ON public.expense_instances;
CREATE POLICY "Company members can manage expense instances" 
ON public.expense_instances 
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

-- Log completion
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_optimization_final', jsonb_build_object(
  'timestamp', now(),
  'tables_optimized', ARRAY['company_drivers', 'company_broker_dispatchers', 'expense_types', 'recurring_expense_templates', 'expense_instances'],
  'description', 'Final RLS policy optimization completed - all auth.uid() calls replaced with (select auth.uid())'
));