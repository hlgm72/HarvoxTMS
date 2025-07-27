-- Optimize RLS policies for better performance by wrapping auth functions in SELECT
-- This prevents re-evaluation for each row

-- Company payment periods policies optimization
DROP POLICY IF EXISTS "Company payment periods delete policy" ON public.company_payment_periods;
CREATE POLICY "Company payment periods delete policy" ON public.company_payment_periods
FOR DELETE 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated') AND is_company_owner_in_company(company_id)
);

DROP POLICY IF EXISTS "Company payment periods select policy" ON public.company_payment_periods;
CREATE POLICY "Company payment periods select policy" ON public.company_payment_periods
FOR SELECT 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated') AND 
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

-- Fuel card provider policies optimization
DROP POLICY IF EXISTS "Users can view fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Users can view fuel card providers" ON public.fuel_card_providers
FOR SELECT 
TO authenticated
USING ((SELECT auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Company managers can update fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Company managers can update fuel card providers" ON public.fuel_card_providers
FOR UPDATE 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated') AND 
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) 
    AND ucr.is_active = true
  )
)
WITH CHECK (
  ((SELECT auth.role()) = 'authenticated') AND 
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) 
    AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Company managers can delete fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Company managers can delete fuel card providers" ON public.fuel_card_providers
FOR DELETE 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated') AND 
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) 
    AND ucr.is_active = true
  )
);

-- Driver fuel cards policies optimization
DROP POLICY IF EXISTS "Driver cards company access policy" ON public.driver_fuel_cards;
CREATE POLICY "Driver cards company access policy" ON public.driver_fuel_cards
FOR SELECT 
TO authenticated
USING (
  ((SELECT auth.role()) = 'authenticated') AND 
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
  ((SELECT auth.role()) = 'authenticated') AND 
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
  ((SELECT auth.role()) = 'authenticated') AND 
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.company_id = driver_fuel_cards.company_id 
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role]) 
    AND ucr.is_active = true
  )
)
WITH CHECK (
  ((SELECT auth.role()) = 'authenticated') AND 
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.company_id = driver_fuel_cards.company_id 
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role]) 
    AND ucr.is_active = true
  )
);