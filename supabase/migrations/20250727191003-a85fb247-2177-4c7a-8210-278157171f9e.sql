-- Comprehensive security linter fixes - Part 2
-- Fix remaining anonymous access policy warnings

-- 1. Create stricter authentication helper functions
CREATE OR REPLACE FUNCTION public.require_authenticated_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN auth.role() = 'authenticated' AND auth.uid() IS NOT NULL THEN true
    ELSE false
  END;
$$;

-- 2. Fix company_client_contacts
DROP POLICY IF EXISTS "Company client contacts complete policy" ON public.company_client_contacts;
CREATE POLICY "Company client contacts complete policy" ON public.company_client_contacts
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND
  client_id IN (
    SELECT cc.id FROM company_clients cc
    WHERE cc.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND
  client_id IN (
    SELECT cc.id FROM company_clients cc
    WHERE cc.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

-- 3. Fix company_documents
DROP POLICY IF EXISTS "Company documents complete policy" ON public.company_documents;
CREATE POLICY "Company documents complete policy" ON public.company_documents
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

-- 4. Fix company_drivers
DROP POLICY IF EXISTS "Company drivers complete policy" ON public.company_drivers;
CREATE POLICY "Company drivers complete policy" ON public.company_drivers
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    auth.uid() = user_id OR
    user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND
  auth.uid() = user_id
);

-- 5. Fix company_equipment
DROP POLICY IF EXISTS "Company equipment access policy" ON public.company_equipment;
CREATE POLICY "Company equipment access policy" ON public.company_equipment
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

-- 6. Fix company_payment_periods policies
DROP POLICY IF EXISTS "Company payment periods select policy" ON public.company_payment_periods;
CREATE POLICY "Company payment periods select policy" ON public.company_payment_periods
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
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
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Company payment periods delete policy" ON public.company_payment_periods;
CREATE POLICY "Company payment periods delete policy" ON public.company_payment_periods
FOR DELETE 
TO authenticated
USING (
  require_authenticated_user() AND
  is_company_owner_in_company(company_id)
);

-- 7. Fix driver_fuel_cards policies
DROP POLICY IF EXISTS "Driver cards company access policy" ON public.driver_fuel_cards;
CREATE POLICY "Driver cards company access policy" ON public.driver_fuel_cards
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
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
    WHERE ucr.user_id = auth.uid()
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
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = driver_fuel_cards.company_id
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role])
    AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = driver_fuel_cards.company_id
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role])
    AND ucr.is_active = true
  )
);

-- 8. Fix driver_period_calculations policies
DROP POLICY IF EXISTS "Driver period calculations select policy" ON public.driver_period_calculations;
CREATE POLICY "Driver period calculations select policy" ON public.driver_period_calculations
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND (
    auth.uid() = driver_user_id OR
    company_payment_period_id IN (
      SELECT cpp.id FROM company_payment_periods cpp
      WHERE cpp.company_id IN (
        SELECT ucr.company_id FROM user_company_roles ucr
        WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
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
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND
  company_payment_period_id IN (
    SELECT cpp.id FROM company_payment_periods cpp
    WHERE cpp.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
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
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    ) AND is_company_owner_in_company(cpp.company_id)
  )
);

-- 9. Fix driver_profiles
DROP POLICY IF EXISTS "Driver profiles complete policy" ON public.driver_profiles;
CREATE POLICY "Driver profiles complete policy" ON public.driver_profiles
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    auth.uid() = user_id OR
    user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND
  auth.uid() = user_id
);