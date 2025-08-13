-- Fix RLS policies for driver_fuel_cards and fuel_card_providers

-- First, let's update the fuel_card_providers policy to be more permissive
DROP POLICY IF EXISTS "Users can view fuel card providers" ON fuel_card_providers;

CREATE POLICY "Authenticated users can view fuel card providers"
ON fuel_card_providers FOR SELECT
USING (
  auth.role() = 'authenticated' AND 
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
);

-- Now let's add the missing policies for driver_fuel_cards
CREATE POLICY "Company users can insert driver fuel cards"
ON driver_fuel_cards FOR INSERT
WITH CHECK (
  auth.role() = 'authenticated' AND 
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

CREATE POLICY "Company users can update driver fuel cards"
ON driver_fuel_cards FOR UPDATE
USING (
  auth.role() = 'authenticated' AND 
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND 
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

CREATE POLICY "Company users can delete driver fuel cards"
ON driver_fuel_cards FOR DELETE
USING (
  auth.role() = 'authenticated' AND 
  auth.uid() IS NOT NULL AND 
  COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);