-- The policy already exists! Let's just keep the existing working policy
-- and remove any conflicting ones

-- Remove any duplicate or conflicting policies but keep the working one
DROP POLICY IF EXISTS "Company equipment select policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment insert policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment update policy" ON company_equipment;  
DROP POLICY IF EXISTS "Company equipment delete policy" ON company_equipment;
DROP POLICY IF EXISTS "Authenticated users can view company equipment" ON company_equipment;
DROP POLICY IF EXISTS "Authenticated users can insert company equipment" ON company_equipment;
DROP POLICY IF EXISTS "Authenticated users can update company equipment" ON company_equipment;
DROP POLICY IF EXISTS "Authenticated users can delete company equipment" ON company_equipment;