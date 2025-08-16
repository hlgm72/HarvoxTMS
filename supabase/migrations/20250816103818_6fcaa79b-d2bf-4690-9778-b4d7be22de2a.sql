-- Final definitive fix for SECURITY DEFINER views
-- Recreate views with security_invoker = true to respect RLS

-- Drop existing views
DROP VIEW IF EXISTS public.companies_public CASCADE;
DROP VIEW IF EXISTS public.companies_financial CASCADE;
DROP VIEW IF EXISTS public.equipment_status_summary CASCADE;

-- Recreate companies_public view with security_invoker = true
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
  status,
  plan_type,
  created_at,
  updated_at
FROM companies;

-- Recreate companies_financial view with security_invoker = true
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
FROM companies;

-- Recreate equipment_status_summary view with security_invoker = true
CREATE VIEW public.equipment_status_summary
WITH (security_invoker = true) AS
SELECT 
  ce.id,
  ce.company_id,
  ce.equipment_number,
  ce.equipment_type,
  ce.year,
  ce.make,
  ce.model,
  ce.vin_number,
  ce.license_plate,
  ce.license_plate_expiry_date,
  ce.annual_inspection_expiry_date,
  ce.status,
  ce.purchase_date,
  ce.purchase_price,
  ce.current_mileage,
  ce.fuel_type,
  ce.insurance_expiry_date,
  ce.registration_expiry_date,
  ce.notes,
  ce.geotab_vehicle_id,
  ce.created_by,
  ce.updated_by,
  ce.created_at,
  ce.updated_at,
  CASE
    WHEN ce.insurance_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.insurance_expiry_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 'expiring'
    ELSE 'valid'
  END AS insurance_status,
  CASE
    WHEN ce.registration_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.registration_expiry_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 'expiring'
    ELSE 'valid'
  END AS registration_status,
  CASE
    WHEN ce.license_plate_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.license_plate_expiry_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 'expiring'
    ELSE 'valid'
  END AS license_status,
  CASE
    WHEN ce.annual_inspection_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.annual_inspection_expiry_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 'expiring'
    ELSE 'valid'
  END AS inspection_status,
  0::bigint AS has_title,
  0::bigint AS has_registration,
  0::bigint AS has_inspection,
  0::bigint AS has_form_2290
FROM company_equipment ce;

-- Set proper permissions for authenticated users
GRANT SELECT ON public.companies_public TO authenticated;
GRANT SELECT ON public.companies_financial TO authenticated;
GRANT SELECT ON public.equipment_status_summary TO authenticated;

-- Revoke from public and anon for security
REVOKE ALL ON public.companies_public FROM public, anon;
REVOKE ALL ON public.companies_financial FROM public, anon;
REVOKE ALL ON public.equipment_status_summary FROM public, anon;