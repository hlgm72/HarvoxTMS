-- Drop and recreate the companies_financial view with proper columns
DROP VIEW IF EXISTS public.companies_financial;

CREATE VIEW public.companies_financial AS
SELECT 
  c.id,
  c.name,
  c.street_address,
  c.state_id,
  c.zip_code,
  c.city,
  c.phone,
  c.email,
  c.ein,
  c.mc_number,
  c.dot_number,
  c.owner_name,
  c.owner_email,
  c.owner_phone,
  c.owner_title,
  c.max_vehicles,
  c.max_users,
  c.contract_start_date,
  c.default_payment_frequency,
  c.payment_cycle_start_day,
  c.payment_day,
  c.default_factoring_percentage,
  c.default_dispatching_percentage,
  c.default_leasing_percentage,
  c.load_assignment_criteria,
  c.plan_type,
  c.status,
  c.logo_url,
  c.created_at,
  c.updated_at
FROM companies c
WHERE auth.role() = 'authenticated' 
  AND auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND can_access_company_financial_data(c.id);

COMMENT ON VIEW public.companies_financial IS 'Security: Financial and sensitive company data. Restricted to company owners, operations managers, and superadmins only.';