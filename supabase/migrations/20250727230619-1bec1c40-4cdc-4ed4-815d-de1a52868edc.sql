-- New approach: Create function that returns valid user_id or NULL
CREATE OR REPLACE FUNCTION public.get_authenticated_user_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN (SELECT auth.role()) = 'authenticated' 
         AND (SELECT auth.uid()) IS NOT NULL 
         AND COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false) = false
         AND EXISTS (SELECT 1 FROM user_company_roles WHERE user_id = (SELECT auth.uid()) AND is_active = true)
    THEN (SELECT auth.uid())
    ELSE NULL
  END;
$$;

-- Drop all existing policies
DROP POLICY IF EXISTS "Company equipment select policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment insert policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment update policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment delete policy" ON company_equipment;

-- Create new policies that explicitly reject NULL users (anonymous)
CREATE POLICY "Company equipment select policy" 
ON company_equipment 
FOR SELECT 
TO authenticated
USING (
  get_authenticated_user_id() IS NOT NULL AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = get_authenticated_user_id() 
    AND is_active = true
  )
);

CREATE POLICY "Company equipment insert policy" 
ON company_equipment 
FOR INSERT 
TO authenticated
WITH CHECK (
  get_authenticated_user_id() IS NOT NULL AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = get_authenticated_user_id() 
    AND is_active = true
  )
);

CREATE POLICY "Company equipment update policy" 
ON company_equipment 
FOR UPDATE 
TO authenticated
USING (
  get_authenticated_user_id() IS NOT NULL AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = get_authenticated_user_id() 
    AND is_active = true
  )
)
WITH CHECK (
  get_authenticated_user_id() IS NOT NULL AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = get_authenticated_user_id() 
    AND is_active = true
  )
);

CREATE POLICY "Company equipment delete policy" 
ON company_equipment 
FOR DELETE 
TO authenticated
USING (
  get_authenticated_user_id() IS NOT NULL AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = get_authenticated_user_id() 
    AND is_active = true
  )
);