-- Enable RLS on the views and create restrictive policies

-- Enable RLS on the views
ALTER TABLE companies_basic_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies_financial_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_status_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for companies_basic_info
CREATE POLICY "companies_basic_info_access_policy" 
ON companies_basic_info 
FOR ALL 
TO authenticated
USING (
  -- Allow postgres superuser or authenticated users with company access
  current_user = 'postgres' OR 
  can_access_company_basic_data(id)
);

-- Create RLS policies for companies_financial_data
CREATE POLICY "companies_financial_data_access_policy" 
ON companies_financial_data 
FOR ALL 
TO authenticated
USING (
  -- Allow postgres superuser or authenticated users with financial access
  current_user = 'postgres' OR 
  can_access_company_financial_data(id)
);

-- Create RLS policies for equipment_status_summary
CREATE POLICY "equipment_status_summary_access_policy" 
ON equipment_status_summary 
FOR ALL 
TO authenticated
USING (
  -- Allow postgres superuser or authenticated company users
  current_user = 'postgres' OR 
  (auth.uid() IS NOT NULL AND company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  ))
);

-- Revoke public access from all views
REVOKE ALL ON companies_basic_info FROM PUBLIC;
REVOKE ALL ON companies_financial_data FROM PUBLIC;
REVOKE ALL ON equipment_status_summary FROM PUBLIC;

-- Grant specific access to authenticated users
GRANT SELECT ON companies_basic_info TO authenticated;
GRANT SELECT ON companies_financial_data TO authenticated;
GRANT SELECT ON equipment_status_summary TO authenticated;