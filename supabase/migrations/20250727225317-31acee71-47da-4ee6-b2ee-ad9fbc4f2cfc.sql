-- Optimize RLS policies for company_equipment table to improve performance

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view company equipment" ON company_equipment;
DROP POLICY IF EXISTS "Users can insert company equipment" ON company_equipment;
DROP POLICY IF EXISTS "Users can update company equipment" ON company_equipment;
DROP POLICY IF EXISTS "Users can delete company equipment" ON company_equipment;

-- Create optimized RLS policies with better performance
CREATE POLICY "Users can view company equipment" 
ON company_equipment 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  )
);

CREATE POLICY "Users can insert company equipment" 
ON company_equipment 
FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  )
);

CREATE POLICY "Users can update company equipment" 
ON company_equipment 
FOR UPDATE 
USING (
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  )
)
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  )
);

CREATE POLICY "Users can delete company equipment" 
ON company_equipment 
FOR DELETE 
USING (
  company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  )
);