-- Create RLS policies for company_payment_periods table

-- Policy for SELECT (viewing company payment periods)
CREATE POLICY "Company payment periods read access" ON public.company_payment_periods
FOR SELECT 
USING (
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
    company_id IN (
      SELECT get_user_company_roles.company_id 
      FROM get_user_company_roles(auth.uid()) get_user_company_roles(company_id, role)
    )
  )
);

-- Policy for INSERT (creating company payment periods)
CREATE POLICY "Company payment periods create access" ON public.company_payment_periods
FOR INSERT 
WITH CHECK (
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
    company_id IN (
      SELECT get_user_company_roles.company_id 
      FROM get_user_company_roles(auth.uid()) get_user_company_roles(company_id, role)
    )
  )
);

-- Policy for UPDATE (modifying company payment periods)
CREATE POLICY "Company payment periods update access" ON public.company_payment_periods
FOR UPDATE 
USING (
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
    company_id IN (
      SELECT get_user_company_roles.company_id 
      FROM get_user_company_roles(auth.uid()) get_user_company_roles(company_id, role)
    )
  )
)
WITH CHECK (
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
    company_id IN (
      SELECT get_user_company_roles.company_id 
      FROM get_user_company_roles(auth.uid()) get_user_company_roles(company_id, role)
    )
  )
);

-- Policy for DELETE (deleting company payment periods - restricted to company owners)
CREATE POLICY "Company payment periods delete access" ON public.company_payment_periods
FOR DELETE 
USING (
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
    is_company_owner_in_company(company_id)
  )
);

-- Create RLS policies for driver_period_calculations table

-- Policy for SELECT (viewing driver calculations)
CREATE POLICY "Driver period calculations read access" ON public.driver_period_calculations
FOR SELECT 
USING (
  auth.role() = 'service_role'::text OR 
  (
    auth.role() = 'authenticated'::text AND 
    (
      auth.uid() = driver_user_id OR
      company_payment_period_id IN (
        SELECT cpp.id 
        FROM company_payment_periods cpp 
        WHERE cpp.company_id IN (
          SELECT get_user_company_roles.company_id 
          FROM get_user_company_roles(auth.uid()) get_user_company_roles(company_id, role)
        )
      )
    )
  )
);

-- Policy for INSERT (creating driver calculations)
CREATE POLICY "Driver period calculations create access" ON public.driver_period_calculations
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
        FROM get_user_company_roles(auth.uid()) get_user_company_roles(company_id, role)
      )
    )
  )
);

-- Policy for UPDATE (modifying driver calculations)
CREATE POLICY "Driver period calculations update access" ON public.driver_period_calculations
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
        FROM get_user_company_roles(auth.uid()) get_user_company_roles(company_id, role)
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
        FROM get_user_company_roles(auth.uid()) get_user_company_roles(company_id, role)
      )
    )
  )
);

-- Policy for DELETE (deleting driver calculations - restricted)
CREATE POLICY "Driver period calculations delete access" ON public.driver_period_calculations
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
        FROM get_user_company_roles(auth.uid()) get_user_company_roles(company_id, role)
      ) AND
      is_company_owner_in_company(cpp.company_id)
    )
  )
);