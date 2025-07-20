-- Drop old policies to avoid duplicates
DROP POLICY IF EXISTS "Company payment periods access" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods read access" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods create access" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods update access" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods delete access" ON public.company_payment_periods;

DROP POLICY IF EXISTS "Driver period calculations access" ON public.driver_period_calculations;
DROP POLICY IF EXISTS "Driver period calculations read access" ON public.driver_period_calculations;
DROP POLICY IF EXISTS "Driver period calculations create access" ON public.driver_period_calculations;
DROP POLICY IF EXISTS "Driver period calculations update access" ON public.driver_period_calculations;
DROP POLICY IF EXISTS "Driver period calculations delete access" ON public.driver_period_calculations;

-- Optimized policies for company_payment_periods (single policy per operation)
CREATE POLICY "Company payment periods select policy" ON public.company_payment_periods
FOR SELECT 
USING (
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
    company_id IN (
      SELECT get_user_company_roles.company_id 
      FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
    )
  )
);

CREATE POLICY "Company payment periods insert policy" ON public.company_payment_periods
FOR INSERT 
WITH CHECK (
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
    company_id IN (
      SELECT get_user_company_roles.company_id 
      FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
    )
  )
);

CREATE POLICY "Company payment periods update policy" ON public.company_payment_periods
FOR UPDATE 
USING (
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
    company_id IN (
      SELECT get_user_company_roles.company_id 
      FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
    )
  )
)
WITH CHECK (
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
    company_id IN (
      SELECT get_user_company_roles.company_id 
      FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
    )
  )
);

CREATE POLICY "Company payment periods delete policy" ON public.company_payment_periods
FOR DELETE 
USING (
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
    is_company_owner_in_company(company_id)
  )
);

-- Optimized policies for driver_period_calculations (single policy per operation)
CREATE POLICY "Driver period calculations select policy" ON public.driver_period_calculations
FOR SELECT 
USING (
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
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
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
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
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
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
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
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
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
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

-- Also optimize existing policies that have the same issue
DROP POLICY IF EXISTS "Company clients complete policy" ON public.company_clients;
CREATE POLICY "Company clients complete policy" ON public.company_clients
FOR ALL 
USING (
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
    (NOT is_superadmin((select auth.uid()))) AND 
    company_id IN (
      SELECT get_user_company_roles.company_id
      FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
    )
  )
)
WITH CHECK (
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
    company_id IN (
      SELECT get_user_company_roles.company_id
      FROM get_user_company_roles((select auth.uid())) get_user_company_roles(company_id, role)
    )
  )
);

DROP POLICY IF EXISTS "Company client contacts complete policy" ON public.company_client_contacts;
CREATE POLICY "Company client contacts complete policy" ON public.company_client_contacts
FOR ALL 
USING (
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
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
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
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