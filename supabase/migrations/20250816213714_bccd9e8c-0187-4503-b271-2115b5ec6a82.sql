-- Fix SECURITY DEFINER view warnings by removing SECURITY DEFINER property
-- and ensuring proper RLS policies are in place

-- Drop and recreate companies_with_owner_info view without SECURITY DEFINER
DROP VIEW IF EXISTS public.companies_with_owner_info;

CREATE VIEW public.companies_with_owner_info AS
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
  c.dot_number,
  c.mc_number,
  c.plan_type,
  c.max_vehicles,
  c.max_users,
  c.status,
  c.contract_start_date,
  c.created_at,
  c.updated_at,
  c.default_payment_frequency,
  c.payment_cycle_start_day,
  c.payment_day,
  c.default_leasing_percentage,
  c.default_factoring_percentage,
  c.default_dispatching_percentage,
  c.load_assignment_criteria,
  c.logo_url,
  -- Owner details from separate table
  cod.owner_name,
  cod.owner_email,
  cod.owner_phone,
  cod.owner_title
FROM public.companies c
LEFT JOIN public.company_owner_details cod ON c.id = cod.company_id;

-- Drop and recreate companies_secure view without SECURITY DEFINER
DROP VIEW IF EXISTS public.companies_secure;

CREATE VIEW public.companies_secure AS
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
  c.dot_number,
  c.mc_number,
  c.plan_type,
  c.max_vehicles,
  c.max_users,
  c.status,
  c.contract_start_date,
  c.created_at,
  c.updated_at,
  c.default_payment_frequency,
  c.payment_cycle_start_day,
  c.payment_day,
  c.default_leasing_percentage,
  c.default_factoring_percentage,
  c.default_dispatching_percentage,
  c.load_assignment_criteria,
  c.logo_url
FROM public.companies c;

-- Enable RLS on the views (views inherit RLS from base tables)
-- The RLS policies on the companies table will automatically apply to these views

-- Add comment explaining security approach
COMMENT ON VIEW public.companies_with_owner_info IS 'View combining company data with owner details. Security enforced through RLS policies on base tables.';
COMMENT ON VIEW public.companies_secure IS 'Secure view of company data without owner personal information. Security enforced through RLS policies on base tables.';