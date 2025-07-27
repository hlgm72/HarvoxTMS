-- Fix anonymous access issue by using more explicit RLS policies

-- Drop existing policies
DROP POLICY IF EXISTS "Authenticated users can view company equipment" ON company_equipment;
DROP POLICY IF EXISTS "Authenticated users can insert company equipment" ON company_equipment;
DROP POLICY IF EXISTS "Authenticated users can update company equipment" ON company_equipment;
DROP POLICY IF EXISTS "Authenticated users can delete company equipment" ON company_equipment;

-- Create secure RLS policies that explicitly target authenticated role only
CREATE POLICY "Company equipment select policy" 
ON company_equipment 
FOR SELECT 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false) = false AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  )
);

CREATE POLICY "Company equipment insert policy" 
ON company_equipment 
FOR INSERT 
TO authenticated
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false) = false AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  )
);

CREATE POLICY "Company equipment update policy" 
ON company_equipment 
FOR UPDATE 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false) = false AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  )
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false) = false AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  )
);

CREATE POLICY "Company equipment delete policy" 
ON company_equipment 
FOR DELETE 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false) = false AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  )
);