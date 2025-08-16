-- DEFINITIVE FIX: Completely recreate companies_financial view without any SECURITY DEFINER
-- This will ensure the view has no SECURITY DEFINER properties whatsoever

-- Step 1: Drop the problematic view completely
DROP VIEW IF EXISTS public.companies_financial CASCADE;

-- Step 2: Create a completely new view with explicit security settings
-- Using SECURITY INVOKER (default) to ensure it respects user permissions
CREATE VIEW public.companies_financial 
WITH (security_invoker=true)
AS
SELECT 
  id,
  name,
  street_address,
  state_id,
  zip_code,
  city,
  phone,
  email,
  logo_url,
  status,
  plan_type,
  created_at,
  updated_at,
  owner_name,
  owner_email,
  owner_phone,
  owner_title,
  dot_number,
  mc_number,
  ein,
  max_users,
  max_vehicles,
  default_payment_frequency,
  payment_cycle_start_day,
  payment_day,
  default_leasing_percentage,
  default_factoring_percentage,
  default_dispatching_percentage,
  load_assignment_criteria,
  contract_start_date
FROM public.companies;

-- Step 3: Set proper permissions
REVOKE ALL ON public.companies_financial FROM PUBLIC;
REVOKE ALL ON public.companies_financial FROM anon;
GRANT SELECT ON public.companies_financial TO authenticated;

-- Step 4: Add security documentation
COMMENT ON VIEW public.companies_financial IS 'Financial company data view with SECURITY INVOKER - respects user-level RLS policies from companies table. Contains sensitive business information restricted by table-level Row Level Security.';