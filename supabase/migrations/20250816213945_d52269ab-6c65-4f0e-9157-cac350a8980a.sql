-- Completely drop views and recreate them using explicit non-security definer syntax
DROP VIEW IF EXISTS public.companies_with_owner_info CASCADE;
DROP VIEW IF EXISTS public.companies_secure CASCADE;

-- Also check if there are any functions with these names and drop them
DROP FUNCTION IF EXISTS public.companies_with_owner_info() CASCADE;
DROP FUNCTION IF EXISTS public.companies_secure() CASCADE;

-- Clear any cached definitions
RESET ALL;

-- Recreate companies_with_owner_info view with explicit INVOKER rights (opposite of SECURITY DEFINER)
CREATE VIEW public.companies_with_owner_info 
WITH (security_invoker=true)
AS
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
  cod.owner_name,
  cod.owner_email,
  cod.owner_phone,
  cod.owner_title
FROM public.companies c
LEFT JOIN public.company_owner_details cod ON c.id = cod.company_id;

-- Recreate companies_secure view with explicit INVOKER rights
CREATE VIEW public.companies_secure 
WITH (security_invoker=true)
AS
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

-- Verify the views are created correctly
SELECT 
  c.relname as view_name,
  case when c.relkind = 'v' then 'view' else 'other' end as object_type,
  pg_get_viewdef(c.oid) as view_definition
FROM pg_class c
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relkind = 'v' 
AND n.nspname = 'public' 
AND c.relname IN ('companies_with_owner_info', 'companies_secure');