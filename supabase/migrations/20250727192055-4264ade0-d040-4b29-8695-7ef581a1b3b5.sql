-- Continue fixing RLS performance issues - Part 2

-- Fix fuel_expenses policy
DROP POLICY IF EXISTS "Fuel expenses complete policy" ON public.fuel_expenses;
CREATE POLICY "Fuel expenses complete policy" ON public.fuel_expenses
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    (SELECT auth.uid()) = driver_user_id OR 
    driver_user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  driver_user_id IN (
    SELECT ucr.user_id FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
    ) AND ucr.is_active = true
  ) AND NOT is_period_locked(payment_period_id)
);

-- Fix fuel_limits policy
DROP POLICY IF EXISTS "Fuel limits complete policy" ON public.fuel_limits;
CREATE POLICY "Fuel limits complete policy" ON public.fuel_limits
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    (SELECT auth.uid()) = driver_user_id OR 
    driver_user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  driver_user_id IN (
    SELECT ucr.user_id FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

-- Fix inspections policy
DROP POLICY IF EXISTS "Inspections company access" ON public.inspections;
CREATE POLICY "Inspections company access" ON public.inspections
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND 
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);

-- Fix load_documents policies
DROP POLICY IF EXISTS "Users can view load documents from their company loads" ON public.load_documents;
CREATE POLICY "Users can view load documents from their company loads" ON public.load_documents
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND 
  load_id IN (
    SELECT l.id FROM loads l
    WHERE l.driver_user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Users can update load documents from their company loads" ON public.load_documents;
CREATE POLICY "Users can update load documents from their company loads" ON public.load_documents
FOR UPDATE 
TO authenticated
USING (
  require_authenticated_user() AND 
  load_id IN (
    SELECT l.id FROM loads l
    WHERE l.driver_user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  load_id IN (
    SELECT l.id FROM loads l
    WHERE l.driver_user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Users can delete load documents from their company loads" ON public.load_documents;
CREATE POLICY "Users can delete load documents from their company loads" ON public.load_documents
FOR DELETE 
TO authenticated
USING (
  require_authenticated_user() AND 
  load_id IN (
    SELECT l.id FROM loads l
    WHERE l.driver_user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

-- Fix load_stops policy
DROP POLICY IF EXISTS "Load stops access policy" ON public.load_stops;
CREATE POLICY "Load stops access policy" ON public.load_stops
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND 
  load_id IN (
    SELECT l.id FROM loads l
    WHERE l.driver_user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  load_id IN (
    SELECT l.id FROM loads l
    WHERE l.driver_user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

-- Fix company_payment_periods policies
DROP POLICY IF EXISTS "Company payment periods select policy" ON public.company_payment_periods;
CREATE POLICY "Company payment periods select policy" ON public.company_payment_periods
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Company payment periods update policy" ON public.company_payment_periods;
CREATE POLICY "Company payment periods update policy" ON public.company_payment_periods
FOR UPDATE 
TO authenticated
USING (
  require_authenticated_user() AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

-- Fix driver_fuel_cards policies
DROP POLICY IF EXISTS "Driver cards company access policy" ON public.driver_fuel_cards;
CREATE POLICY "Driver cards company access policy" ON public.driver_fuel_cards
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Driver cards company delete policy" ON public.driver_fuel_cards;
CREATE POLICY "Driver cards company delete policy" ON public.driver_fuel_cards
FOR DELETE 
TO authenticated
USING (
  require_authenticated_user() AND 
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = driver_fuel_cards.company_id
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role])
    AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Driver cards company update policy" ON public.driver_fuel_cards;
CREATE POLICY "Driver cards company update policy" ON public.driver_fuel_cards
FOR UPDATE 
TO authenticated
USING (
  require_authenticated_user() AND 
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = driver_fuel_cards.company_id
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role])
    AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = driver_fuel_cards.company_id
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role])
    AND ucr.is_active = true
  )
);

-- Fix loads policy
DROP POLICY IF EXISTS "Loads comprehensive policy" ON public.loads;
CREATE POLICY "Loads comprehensive policy" ON public.loads
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    (SELECT auth.uid()) = driver_user_id OR 
    driver_user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  driver_user_id IN (
    SELECT ucr.user_id FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
    ) AND ucr.is_active = true
  ) AND NOT is_period_locked(payment_period_id)
);

-- Fix maintenance tables policies
DROP POLICY IF EXISTS "Maintenance records company access" ON public.maintenance_records;
CREATE POLICY "Maintenance records company access" ON public.maintenance_records
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND 
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Maintenance schedules company access" ON public.maintenance_schedules;
CREATE POLICY "Maintenance schedules company access" ON public.maintenance_schedules
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND 
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  equipment_id IN (
    SELECT ce.id FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);

-- Fix other_income policy
DROP POLICY IF EXISTS "Other income comprehensive policy" ON public.other_income;
CREATE POLICY "Other income comprehensive policy" ON public.other_income
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    (SELECT auth.uid()) = driver_user_id OR 
    driver_user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  driver_user_id IN (
    SELECT ucr.user_id FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
    ) AND ucr.is_active = true
  ) AND NOT is_period_locked(payment_period_id)
);

-- Fix driver_period_calculations policies
DROP POLICY IF EXISTS "Driver period calculations select policy" ON public.driver_period_calculations;
CREATE POLICY "Driver period calculations select policy" ON public.driver_period_calculations
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND (
    (SELECT auth.uid()) = driver_user_id OR 
    company_payment_period_id IN (
      SELECT cpp.id FROM company_payment_periods cpp
      WHERE cpp.company_id IN (
        SELECT ucr.company_id FROM user_company_roles ucr
        WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
      )
    )
  )
);

DROP POLICY IF EXISTS "Driver period calculations update policy" ON public.driver_period_calculations;
CREATE POLICY "Driver period calculations update policy" ON public.driver_period_calculations
FOR UPDATE 
TO authenticated
USING (
  require_authenticated_user() AND 
  company_payment_period_id IN (
    SELECT cpp.id FROM company_payment_periods cpp
    WHERE cpp.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  company_payment_period_id IN (
    SELECT cpp.id FROM company_payment_periods cpp
    WHERE cpp.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Driver period calculations delete policy" ON public.driver_period_calculations;
CREATE POLICY "Driver period calculations delete policy" ON public.driver_period_calculations
FOR DELETE 
TO authenticated
USING (
  require_authenticated_user() AND 
  company_payment_period_id IN (
    SELECT cpp.id FROM company_payment_periods cpp
    WHERE cpp.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    ) AND is_company_owner_in_company(cpp.company_id)
  )
);

-- Fix driver_profiles policy
DROP POLICY IF EXISTS "Driver profiles complete policy" ON public.driver_profiles;
CREATE POLICY "Driver profiles complete policy" ON public.driver_profiles
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    (SELECT auth.uid()) = user_id OR 
    user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND (SELECT auth.uid()) = user_id
);

-- Fix payment_reports policy
DROP POLICY IF EXISTS "Users can view payment reports for their company periods" ON public.payment_reports;
CREATE POLICY "Users can view payment reports for their company periods" ON public.payment_reports
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND 
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE cpp.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE cpp.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);