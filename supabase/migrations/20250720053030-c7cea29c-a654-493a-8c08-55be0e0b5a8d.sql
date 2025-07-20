-- Optimizar políticas RLS para mejorar rendimiento
-- Reemplazar auth.uid() y auth.role() con (select auth.uid()) y (select auth.role())

-- 1. Arreglar políticas de company_payment_periods
DROP POLICY IF EXISTS "Company payment periods select policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods insert policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods update policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods delete policy" ON public.company_payment_periods;

CREATE POLICY "Company payment periods select policy" ON public.company_payment_periods
FOR SELECT 
USING (
  (select auth.role()) = 'service_role'::text OR 
  (
    (select auth.role()) = 'authenticated'::text AND 
    company_id IN (
      SELECT get_user_company_roles.company_id 
      FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
    )
  )
);

CREATE POLICY "Company payment periods insert policy" ON public.company_payment_periods
FOR INSERT 
WITH CHECK (
  (select auth.role()) = 'service_role'::text OR 
  (
    (select auth.role()) = 'authenticated'::text AND 
    company_id IN (
      SELECT get_user_company_roles.company_id 
      FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
    )
  )
);

CREATE POLICY "Company payment periods update policy" ON public.company_payment_periods
FOR UPDATE 
USING (
  (select auth.role()) = 'service_role'::text OR 
  (
    (select auth.role()) = 'authenticated'::text AND 
    company_id IN (
      SELECT get_user_company_roles.company_id 
      FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
    )
  )
)
WITH CHECK (
  (select auth.role()) = 'service_role'::text OR 
  (
    (select auth.role()) = 'authenticated'::text AND 
    company_id IN (
      SELECT get_user_company_roles.company_id 
      FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
    )
  )
);

CREATE POLICY "Company payment periods delete policy" ON public.company_payment_periods
FOR DELETE 
USING (
  (select auth.role()) = 'service_role'::text OR 
  (
    (select auth.role()) = 'authenticated'::text AND 
    is_company_owner_in_company(company_id)
  )
);

-- 2. Arreglar políticas de driver_period_calculations
DROP POLICY IF EXISTS "Driver period calculations select policy" ON public.driver_period_calculations;
DROP POLICY IF EXISTS "Driver period calculations insert policy" ON public.driver_period_calculations;
DROP POLICY IF EXISTS "Driver period calculations update policy" ON public.driver_period_calculations;
DROP POLICY IF EXISTS "Driver period calculations delete policy" ON public.driver_period_calculations;

CREATE POLICY "Driver period calculations select policy" ON public.driver_period_calculations
FOR SELECT 
USING (
  (select auth.role()) = 'service_role'::text OR 
  (
    (select auth.role()) = 'authenticated'::text AND 
    (
      (select auth.uid()) = driver_user_id OR
      company_payment_period_id IN (
        SELECT cpp.id 
        FROM company_payment_periods cpp 
        WHERE cpp.company_id IN (
          SELECT get_user_company_roles.company_id 
          FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
        )
      )
    )
  )
);

CREATE POLICY "Driver period calculations insert policy" ON public.driver_period_calculations
FOR INSERT 
WITH CHECK (
  (select auth.role()) = 'service_role'::text OR 
  (
    (select auth.role()) = 'authenticated'::text AND 
    company_payment_period_id IN (
      SELECT cpp.id 
      FROM company_payment_periods cpp 
      WHERE cpp.company_id IN (
        SELECT get_user_company_roles.company_id 
        FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
      )
    )
  )
);

CREATE POLICY "Driver period calculations update policy" ON public.driver_period_calculations
FOR UPDATE 
USING (
  (select auth.role()) = 'service_role'::text OR 
  (
    (select auth.role()) = 'authenticated'::text AND 
    company_payment_period_id IN (
      SELECT cpp.id 
      FROM company_payment_periods cpp 
      WHERE cpp.company_id IN (
        SELECT get_user_company_roles.company_id 
        FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
      )
    )
  )
)
WITH CHECK (
  (select auth.role()) = 'service_role'::text OR 
  (
    (select auth.role()) = 'authenticated'::text AND 
    company_payment_period_id IN (
      SELECT cpp.id 
      FROM company_payment_periods cpp 
      WHERE cpp.company_id IN (
        SELECT get_user_company_roles.company_id 
        FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
      )
    )
  )
);

CREATE POLICY "Driver period calculations delete policy" ON public.driver_period_calculations
FOR DELETE 
USING (
  (select auth.role()) = 'service_role'::text OR 
  (
    (select auth.role()) = 'authenticated'::text AND 
    company_payment_period_id IN (
      SELECT cpp.id 
      FROM company_payment_periods cpp 
      WHERE cpp.company_id IN (
        SELECT get_user_company_roles.company_id 
        FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
      ) AND
      is_company_owner_in_company(cpp.company_id)
    )
  )
);

-- 3. Arreglar política de company_clients
DROP POLICY IF EXISTS "Company clients complete policy" ON public.company_clients;

CREATE POLICY "Company clients complete policy" ON public.company_clients
FOR ALL 
USING (
  (select auth.role()) = 'service_role'::text OR 
  (
    (select auth.role()) = 'authenticated'::text AND 
    (NOT is_superadmin((select auth.uid()))) AND 
    company_id IN (
      SELECT get_user_company_roles.company_id
      FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
    )
  )
)
WITH CHECK (
  (select auth.role()) = 'service_role'::text OR 
  (
    (select auth.role()) = 'authenticated'::text AND 
    company_id IN (
      SELECT get_user_company_roles.company_id
      FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
    )
  )
);

-- 4. Arreglar política de company_client_contacts
DROP POLICY IF EXISTS "Company client contacts complete policy" ON public.company_client_contacts;

CREATE POLICY "Company client contacts complete policy" ON public.company_client_contacts
FOR ALL 
USING (
  (select auth.role()) = 'service_role'::text OR 
  (
    (select auth.role()) = 'authenticated'::text AND 
    client_id IN (
      SELECT cc.id
      FROM company_clients cc
      WHERE cc.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
      )
    )
  )
)
WITH CHECK (
  (select auth.role()) = 'service_role'::text OR 
  (
    (select auth.role()) = 'authenticated'::text AND 
    client_id IN (
      SELECT cc.id
      FROM company_clients cc
      WHERE cc.company_id IN (
        SELECT get_user_company_roles.company_id
        FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
      )
    )
  )
);

-- Log de optimización
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_auth_optimization_final', jsonb_build_object(
  'timestamp', now(),
  'description', 'Final optimization of auth.uid() and auth.role() calls in RLS policies',
  'tables_optimized', ARRAY['company_payment_periods', 'driver_period_calculations', 'company_clients', 'company_client_contacts'],
  'optimization_type', 'select_wrapper_for_auth_functions'
));