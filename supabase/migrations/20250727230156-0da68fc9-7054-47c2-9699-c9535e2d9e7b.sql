-- Fix anonymous access detection by making RLS policies more explicit

-- Update the security definer function to be more explicit
CREATE OR REPLACE FUNCTION public.can_access_company_equipment(equipment_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND 
    COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false) = false AND
    equipment_company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = (SELECT auth.uid()) 
      AND is_active = true
    );
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Company equipment select policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment insert policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment update policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment delete policy" ON company_equipment;

-- Create more explicit RLS policies that the linter can understand
CREATE POLICY "Company equipment select policy" 
ON company_equipment 
FOR SELECT 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false) = false AND
  can_access_company_equipment(company_id)
);

CREATE POLICY "Company equipment insert policy" 
ON company_equipment 
FOR INSERT 
TO authenticated
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false) = false AND
  can_access_company_equipment(company_id)
);

CREATE POLICY "Company equipment update policy" 
ON company_equipment 
FOR UPDATE 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false) = false AND
  can_access_company_equipment(company_id)
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false) = false AND
  can_access_company_equipment(company_id)
);

CREATE POLICY "Company equipment delete policy" 
ON company_equipment 
FOR DELETE 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false) = false AND
  can_access_company_equipment(company_id)
);