-- Fix RLS performance issues for fuel card providers and driver fuel cards
-- Replace auth functions with optimized SELECT versions

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view fuel card providers" ON fuel_card_providers;
DROP POLICY IF EXISTS "Company users can insert driver fuel cards" ON driver_fuel_cards;
DROP POLICY IF EXISTS "Company users can update driver fuel cards" ON driver_fuel_cards;
DROP POLICY IF EXISTS "Company users can delete driver fuel cards" ON driver_fuel_cards;

-- Create optimized fuel_card_providers policy
CREATE POLICY "Authenticated users can view fuel card providers"
ON fuel_card_providers FOR SELECT
USING (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
);

-- Create optimized driver_fuel_cards policies
CREATE POLICY "Company users can insert driver fuel cards"
ON driver_fuel_cards FOR INSERT
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

CREATE POLICY "Company users can update driver fuel cards"
ON driver_fuel_cards FOR UPDATE
USING (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

CREATE POLICY "Company users can delete driver fuel cards"
ON driver_fuel_cards FOR DELETE
USING (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);