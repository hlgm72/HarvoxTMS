-- Fix INSERT policies with correct syntax

-- Fix maintenance_types INSERT policy
CREATE POLICY "Service role can insert maintenance types" ON public.maintenance_types
FOR INSERT 
TO service_role
WITH CHECK (true);

-- Fix expense_instances INSERT policy  
CREATE POLICY "Users can insert expense_instances for their company" ON public.expense_instances
FOR INSERT 
TO authenticated
WITH CHECK (
  require_authenticated_user() AND
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true 
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'dispatcher'::user_role, 'operations_manager'::user_role])
  )
);

-- Fix fuel_card_providers INSERT policy
CREATE POLICY "Company managers can insert fuel card providers" ON public.fuel_card_providers
FOR INSERT 
TO authenticated
WITH CHECK (
  require_authenticated_user() AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
    AND ucr.is_active = true
  )
);

-- Add missing INSERT policy for driver_fuel_cards
CREATE POLICY "Driver cards company insert policy" ON public.driver_fuel_cards
FOR INSERT 
TO authenticated
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

-- Add missing INSERT policy for company_payment_periods
CREATE POLICY "Company payment periods insert policy" ON public.company_payment_periods
FOR INSERT 
TO authenticated
WITH CHECK (
  require_authenticated_user() AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

-- Add missing INSERT policy for driver_period_calculations
CREATE POLICY "Driver period calculations insert policy" ON public.driver_period_calculations
FOR INSERT 
TO authenticated
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