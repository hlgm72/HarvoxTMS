-- Final solution: Use existing optimized function and minimal auth checks

-- Drop all existing policies
DROP POLICY IF EXISTS "Company equipment select policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment insert policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment update policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment delete policy" ON company_equipment;

-- Remove the custom function since we'll use the existing one
DROP FUNCTION IF EXISTS public.can_access_company_equipment(uuid);

-- Create final optimized RLS policies using existing infrastructure
CREATE POLICY "Company equipment select policy" 
ON company_equipment 
FOR SELECT 
TO authenticated
USING (
  is_authenticated_company_user() AND
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
  is_authenticated_company_user() AND
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
  is_authenticated_company_user() AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  )
)
WITH CHECK (
  is_authenticated_company_user() AND
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
  is_authenticated_company_user() AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  )
);