-- Explicitly revoke access from anon role to completely secure the views
REVOKE ALL ON companies_basic_info FROM anon;
REVOKE ALL ON companies_financial_data FROM anon;
REVOKE ALL ON equipment_status_summary FROM anon;

-- Also revoke from public role if any grants remain
REVOKE ALL ON companies_basic_info FROM public;
REVOKE ALL ON companies_financial_data FROM public;
REVOKE ALL ON equipment_status_summary FROM public;

-- Ensure only authenticated users have access
GRANT SELECT ON companies_basic_info TO authenticated;
GRANT SELECT ON companies_financial_data TO authenticated;
GRANT SELECT ON equipment_status_summary TO authenticated;

-- Verify final permissions
SELECT 
  viewname,
  has_table_privilege('anon', 'public.'||viewname, 'SELECT') as anon_access,
  has_table_privilege('authenticated', 'public.'||viewname, 'SELECT') as auth_access
FROM pg_views 
WHERE viewname IN ('companies_basic_info', 'companies_financial_data', 'equipment_status_summary');