-- Create optimized security definer function for company equipment access
CREATE OR REPLACE FUNCTION public.can_access_company_equipment(equipment_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    auth.role() = 'authenticated' AND
    auth.uid() IS NOT NULL AND 
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    equipment_company_id IN (
      SELECT company_id 
      FROM user_company_roles 
      WHERE user_id = auth.uid() 
      AND is_active = true
    );
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Company equipment select policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment insert policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment update policy" ON company_equipment;
DROP POLICY IF EXISTS "Company equipment delete policy" ON company_equipment;

-- Create new optimized RLS policies using the security definer function
CREATE POLICY "Company equipment select policy" 
ON company_equipment 
FOR SELECT 
TO authenticated
USING (can_access_company_equipment(company_id));

CREATE POLICY "Company equipment insert policy" 
ON company_equipment 
FOR INSERT 
TO authenticated
WITH CHECK (can_access_company_equipment(company_id));

CREATE POLICY "Company equipment update policy" 
ON company_equipment 
FOR UPDATE 
TO authenticated
USING (can_access_company_equipment(company_id))
WITH CHECK (can_access_company_equipment(company_id));

CREATE POLICY "Company equipment delete policy" 
ON company_equipment 
FOR DELETE 
TO authenticated
USING (can_access_company_equipment(company_id));