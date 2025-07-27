-- Phase 2: Fix 5 more critical business tables
-- Focus on company_equipment, driver_period_calculations, driver_profiles, fuel_expenses, loads

-- 1. Company equipment - optimize
DROP POLICY IF EXISTS "Company equipment access policy" ON public.company_equipment;
CREATE POLICY "Company equipment access policy" ON public.company_equipment
FOR ALL 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated') AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
)
WITH CHECK (
  ((SELECT auth.role()) = 'authenticated') AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

-- 2. Driver period calculations - optimize all policies
DROP POLICY IF EXISTS "Driver period calculations delete policy" ON public.driver_period_calculations;
DROP POLICY IF EXISTS "Driver period calculations select policy" ON public.driver_period_calculations;
DROP POLICY IF EXISTS "Driver period calculations update policy" ON public.driver_period_calculations;

CREATE POLICY "Driver period calculations delete policy" ON public.driver_period_calculations
FOR DELETE 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated') AND 
  company_payment_period_id IN (
    SELECT cpp.id FROM company_payment_periods cpp
    WHERE cpp.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    ) AND is_company_owner_in_company(cpp.company_id)
  )
);

CREATE POLICY "Driver period calculations select policy" ON public.driver_period_calculations
FOR SELECT 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated') AND (
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

CREATE POLICY "Driver period calculations update policy" ON public.driver_period_calculations
FOR UPDATE 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated') AND 
  company_payment_period_id IN (
    SELECT cpp.id FROM company_payment_periods cpp
    WHERE cpp.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  ((SELECT auth.role()) = 'authenticated') AND 
  company_payment_period_id IN (
    SELECT cpp.id FROM company_payment_periods cpp
    WHERE cpp.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);

-- 3. Driver profiles - optimize
DROP POLICY IF EXISTS "Driver profiles complete policy" ON public.driver_profiles;
CREATE POLICY "Driver profiles complete policy" ON public.driver_profiles
FOR ALL 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated') AND (
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
  ((SELECT auth.role()) = 'authenticated') AND (SELECT auth.uid()) = user_id
);

-- 4. Fuel expenses - optimize
DROP POLICY IF EXISTS "Fuel expenses complete policy" ON public.fuel_expenses;
CREATE POLICY "Fuel expenses complete policy" ON public.fuel_expenses
FOR ALL 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated') AND (
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
  ((SELECT auth.role()) = 'authenticated') AND 
  driver_user_id IN (
    SELECT ucr.user_id FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id FROM user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
    ) AND ucr.is_active = true
  ) AND NOT is_period_locked(payment_period_id)
);

-- 5. Loads - optimize
DROP POLICY IF EXISTS "Loads comprehensive policy" ON public.loads;
CREATE POLICY "Loads comprehensive policy" ON public.loads
FOR ALL 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated') AND (
    (SELECT auth.uid()) = driver_user_id OR 
    (SELECT auth.uid()) = created_by OR
    driver_user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    ) OR
    created_by IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  ((SELECT auth.role()) = 'authenticated') AND (
    (SELECT auth.uid()) = created_by OR
    created_by IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);