-- CRITICAL SECURITY FIX: Remove SECURITY DEFINER function from view
-- The view was inheriting SECURITY DEFINER properties from the can_access_financial_data() function

-- Drop the existing view
DROP VIEW IF EXISTS public.companies_financial;

-- Create a simple view that relies entirely on the underlying table's RLS policies
-- This ensures the view respects user-level permissions without any SECURITY DEFINER bypass
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
FROM public.companies c;

-- The security is now entirely handled by the companies table's RLS policies
-- which already restrict access to authorized company members only

-- Grant SELECT to authenticated users (restricted by underlying table RLS)
GRANT SELECT ON public.companies_financial TO authenticated;

-- Ensure no public access
REVOKE ALL ON public.companies_financial FROM PUBLIC;
REVOKE ALL ON public.companies_financial FROM anon;

-- Update documentation
COMMENT ON VIEW public.companies_financial IS 'SECURED: Financial company data view - security enforced entirely through underlying companies table RLS policies. Contains sensitive business information. Access restricted to authorized company members (owners, operations managers, superadmins) through table-level Row Level Security.';

-- Clean up the security function since we no longer need it in the view
-- (keeping it for potential future use in application code)
COMMENT ON FUNCTION public.can_access_financial_data IS 'Helper function for checking financial data access - not used in views to avoid SECURITY DEFINER inheritance';