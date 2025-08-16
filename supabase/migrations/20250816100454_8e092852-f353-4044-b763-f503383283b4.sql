-- Force drop and recreate views with explicit security_invoker
-- This should completely eliminate SECURITY DEFINER errors

-- Drop views completely with CASCADE to remove dependencies
DROP VIEW IF EXISTS public.companies_financial CASCADE;
DROP VIEW IF EXISTS public.companies_public CASCADE;

-- Recreate companies_public view with explicit security_invoker (opposite of SECURITY DEFINER)
CREATE VIEW public.companies_public
WITH (security_invoker = true) AS
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
  plan_type,
  status,
  created_at,
  updated_at
FROM public.companies;

-- Recreate companies_financial view with explicit security_invoker 
CREATE VIEW public.companies_financial
WITH (security_invoker = true) AS
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
  plan_type,
  status,
  created_at,
  updated_at,
  ein,
  mc_number,
  dot_number,
  owner_name,
  owner_email,
  owner_phone,
  owner_title,
  max_vehicles,
  max_users,
  contract_start_date,
  default_payment_frequency,
  payment_cycle_start_day,
  payment_day,
  default_factoring_percentage,
  default_dispatching_percentage,
  default_leasing_percentage,
  load_assignment_criteria
FROM public.companies;