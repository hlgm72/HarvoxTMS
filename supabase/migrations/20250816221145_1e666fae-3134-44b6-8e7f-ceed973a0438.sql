-- Secure driver_fuel_cards table
-- This table already has RLS but let's ensure it's properly configured

-- Check existing policies and secure driver_fuel_cards
ALTER TABLE driver_fuel_cards ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any and recreate with proper anonymous protection
DROP POLICY IF EXISTS "Company users can view driver fuel cards" ON driver_fuel_cards;
DROP POLICY IF EXISTS "Company users can insert driver fuel cards" ON driver_fuel_cards;
DROP POLICY IF EXISTS "Company users can update driver fuel cards" ON driver_fuel_cards;
DROP POLICY IF EXISTS "Company users can delete driver fuel cards" ON driver_fuel_cards;

-- Create comprehensive policy for all operations
CREATE POLICY "driver_fuel_cards_authenticated_secure_access"
ON driver_fuel_cards
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
    -- Drivers can see their own fuel cards
    driver_user_id = (SELECT auth.uid())
    OR
    -- Company admins can see fuel cards for their company drivers
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
    -- Company admins can manage fuel cards for their company
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  )
);