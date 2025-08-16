-- Force drop and recreate views without any SECURITY DEFINER properties
-- Check if views exist first and drop them completely

DROP VIEW IF EXISTS public.companies_with_owner_info CASCADE;
DROP VIEW IF EXISTS public.companies_secure CASCADE;

-- Recreate companies_with_owner_info view (standard view, no SECURITY DEFINER)
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

-- Recreate companies_secure view (standard view, no SECURITY DEFINER)
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

-- Verify the views are created as standard views
SELECT 
  schemaname,
  viewname,
  definition
FROM pg_views 
WHERE viewname IN ('companies_with_owner_info', 'companies_secure') 
AND schemaname = 'public';