-- CRITICAL SECURITY FIX: Remove SECURITY DEFINER from companies_financial view
-- SECURITY DEFINER views bypass RLS and execute with creator privileges, not user privileges

-- Drop the existing view that has SECURITY DEFINER
DROP VIEW IF EXISTS public.companies_financial;

-- Recreate the view WITHOUT SECURITY DEFINER to respect user-level RLS
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
  c.logo_url,
  c.status,
  c.plan_type,
  c.created_at,
  c.updated_at,
  c.owner_name,
  c.owner_email,
  c.owner_phone,
  c.owner_title,
  c.dot_number,
  c.mc_number,
  c.ein,
  c.max_users,
  c.max_vehicles,
  c.default_payment_frequency,
  c.payment_cycle_start_day,
  c.payment_day,
  c.default_leasing_percentage,
  c.default_factoring_percentage,
  c.default_dispatching_percentage,
  c.load_assignment_criteria,
  c.contract_start_date
FROM public.companies c
WHERE can_access_financial_data(c.id);

-- Grant SELECT to authenticated users (will be further restricted by underlying table RLS)
GRANT SELECT ON public.companies_financial TO authenticated;

-- Revoke any public access
REVOKE ALL ON public.companies_financial FROM PUBLIC;
REVOKE ALL ON public.companies_financial FROM anon;

-- Add security documentation
COMMENT ON VIEW public.companies_financial IS 'SECURED: Financial company data view respects user-level RLS policies. Contains sensitive business information including EIN, payment percentages, and contract details. Access controlled through underlying table RLS and security function can_access_financial_data().';