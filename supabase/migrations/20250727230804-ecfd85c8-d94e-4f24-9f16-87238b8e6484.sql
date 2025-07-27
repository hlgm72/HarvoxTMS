-- Final approach: Remove TO authenticated and use explicit role verification
-- This should make the linter understand that anonymous users are explicitly blocked

-- Drop all existing policies
DROP POLICY IF EXISTS "Company equipment select policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment insert policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment update policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment delete policy" ON company_equipment;

-- Drop the function as we'll use direct checks
DROP FUNCTION IF EXISTS public.get_authenticated_user_id();

-- Create policies without TO authenticated but with explicit role checks
CREATE POLICY "Company equipment select policy" 
ON company_equipment 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt() ->> 'is_anonymous')::boolean IS FALSE AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Company equipment insert policy" 
ON company_equipment 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt() ->> 'is_anonymous')::boolean IS FALSE AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Company equipment update policy" 
ON company_equipment 
FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt() ->> 'is_anonymous')::boolean IS FALSE AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt() ->> 'is_anonymous')::boolean IS FALSE AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);

CREATE POLICY "Company equipment delete policy" 
ON company_equipment 
FOR DELETE 
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt() ->> 'is_anonymous')::boolean IS FALSE AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true
  )
);