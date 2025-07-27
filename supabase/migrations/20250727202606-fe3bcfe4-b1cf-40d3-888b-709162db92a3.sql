-- Corrigiendo políticas críticas (lote 3) - Storage, Fuel Cards, Equipment

-- Fuel card providers policies
DROP POLICY IF EXISTS "Company managers can delete fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Company managers can delete fuel card providers" ON public.fuel_card_providers
FOR DELETE TO authenticated
USING (
  public.is_authenticated_company_user() AND 
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) 
      AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "Company managers can update fuel card providers" ON public.fuel_card_providers;
CREATE POLICY "Company managers can update fuel card providers" ON public.fuel_card_providers
FOR UPDATE TO authenticated
USING (
  public.is_authenticated_company_user() AND 
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) 
      AND ucr.is_active = true
  )
)
WITH CHECK (
  public.is_authenticated_company_user() AND 
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role]) 
      AND ucr.is_active = true
  )
);

-- Driver fuel cards policies
DROP POLICY IF EXISTS "Driver cards company access policy" ON public.driver_fuel_cards;
CREATE POLICY "Driver cards company access policy" ON public.driver_fuel_cards
FOR SELECT TO authenticated
USING (public.is_authenticated_company_user() AND company_id IN (
  SELECT ucr.company_id FROM user_company_roles ucr
  WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
));

DROP POLICY IF EXISTS "Driver cards company delete policy" ON public.driver_fuel_cards;
CREATE POLICY "Driver cards company delete policy" ON public.driver_fuel_cards
FOR DELETE TO authenticated
USING (
  public.is_authenticated_company_user() AND 
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
FOR UPDATE TO authenticated
USING (
  public.is_authenticated_company_user() AND 
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.company_id = driver_fuel_cards.company_id 
      AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role]) 
      AND ucr.is_active = true
  )
)
WITH CHECK (
  public.is_authenticated_company_user() AND 
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.company_id = driver_fuel_cards.company_id 
      AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role]) 
      AND ucr.is_active = true
  )
);