-- Fix security issue: Prevent anonymous access to company_equipment table

-- Drop existing policies that allow anonymous access
DROP POLICY IF EXISTS "Users can view company equipment" ON company_equipment;
DROP POLICY IF EXISTS "Users can insert company equipment" ON company_equipment;
DROP POLICY IF EXISTS "Users can update company equipment" ON company_equipment;
DROP POLICY IF EXISTS "Users can delete company equipment" ON company_equipment;

-- Create secure RLS policies that exclude anonymous users
CREATE POLICY "Authenticated users can view company equipment" 
ON company_equipment 
FOR SELECT 
USING (
  is_authenticated_company_user() AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  )
);

CREATE POLICY "Authenticated users can insert company equipment" 
ON company_equipment 
FOR INSERT 
WITH CHECK (
  is_authenticated_company_user() AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  )
);

CREATE POLICY "Authenticated users can update company equipment" 
ON company_equipment 
FOR UPDATE 
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

CREATE POLICY "Authenticated users can delete company equipment" 
ON company_equipment 
FOR DELETE 
USING (
  is_authenticated_company_user() AND
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  )
);