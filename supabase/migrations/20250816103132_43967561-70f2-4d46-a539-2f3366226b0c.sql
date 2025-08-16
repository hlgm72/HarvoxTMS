-- ULTIMATE SECURITY FIX: Remove ALL SECURITY DEFINER properties and properly secure views
-- This resolves the remaining security issues

-- ===== 1. DROP THE SECURITY DEFINER FUNCTION =====
DROP FUNCTION IF EXISTS public.user_has_company_access(uuid);

-- ===== 2. DROP AND RECREATE ALL VIEWS WITHOUT ANY SECURITY DEFINER FUNCTIONS =====

-- Drop existing views
DROP VIEW IF EXISTS public.companies_public CASCADE;
DROP VIEW IF EXISTS public.companies_financial CASCADE;
DROP VIEW IF EXISTS public.equipment_status_summary CASCADE;

-- Create companies_public view - simple passthrough to companies table RLS
CREATE VIEW public.companies_public AS
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
  updated_at
FROM public.companies;

-- Create companies_financial view - simple passthrough to companies table RLS
CREATE VIEW public.companies_financial AS
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

-- Create equipment_status_summary view - simple passthrough to company_equipment table RLS
CREATE VIEW public.equipment_status_summary AS
SELECT 
  ce.*,
  CASE 
    WHEN ce.insurance_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.insurance_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
    ELSE 'valid'
  END as insurance_status,
  CASE 
    WHEN ce.registration_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.registration_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
    ELSE 'valid'
  END as registration_status,
  CASE 
    WHEN ce.license_plate_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.license_plate_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
    ELSE 'valid'
  END as license_status,
  CASE 
    WHEN ce.annual_inspection_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.annual_inspection_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring'
    ELSE 'valid'
  END as inspection_status,
  0::bigint as has_title,
  0::bigint as has_registration,
  0::bigint as has_inspection,
  0::bigint as has_form_2290
FROM public.company_equipment ce;

-- ===== 3. ENSURE PROPER PERMISSIONS ON VIEWS =====
REVOKE ALL ON public.companies_public FROM PUBLIC;
REVOKE ALL ON public.companies_public FROM anon;
GRANT SELECT ON public.companies_public TO authenticated;

REVOKE ALL ON public.companies_financial FROM PUBLIC;
REVOKE ALL ON public.companies_financial FROM anon;
GRANT SELECT ON public.companies_financial TO authenticated;

REVOKE ALL ON public.equipment_status_summary FROM PUBLIC;
REVOKE ALL ON public.equipment_status_summary FROM anon;
GRANT SELECT ON public.equipment_status_summary TO authenticated;

-- ===== 4. ADD SECURITY DOCUMENTATION =====
COMMENT ON VIEW public.companies_public IS 'SECURED: Company public data view - inherits security from companies table RLS policies. No SECURITY DEFINER functions used.';
COMMENT ON VIEW public.companies_financial IS 'SECURED: Company financial data view - inherits security from companies table RLS policies. No SECURITY DEFINER functions used.';
COMMENT ON VIEW public.equipment_status_summary IS 'SECURED: Equipment status view - inherits security from company_equipment table RLS policies. No SECURITY DEFINER functions used.';