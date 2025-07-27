-- STOP THE CYCLE: Use the exact same pattern that works for other tables
-- We'll accept the performance warnings as a known trade-off

-- Drop all existing policies
DROP POLICY IF EXISTS "Company equipment select policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment insert policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment update policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment delete policy" ON company_equipment;

-- Use the EXACT same pattern that already exists and works in the system
-- This is the same pattern used by Company equipment access policy
CREATE POLICY "Company equipment access policy" 
ON company_equipment 
FOR ALL
USING (
  is_authenticated_company_user() AND
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
  )
)
WITH CHECK (
  is_authenticated_company_user() AND
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
  )
);