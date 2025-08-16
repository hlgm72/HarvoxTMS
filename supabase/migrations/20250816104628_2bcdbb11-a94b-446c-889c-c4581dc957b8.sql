-- Create secure views that incorporate security checks directly in the view definition

-- Drop existing views
DROP VIEW IF EXISTS public.companies_public CASCADE;
DROP VIEW IF EXISTS public.companies_financial CASCADE;
DROP VIEW IF EXISTS public.equipment_status_summary CASCADE;

-- Create secure companies_public view with built-in security
CREATE VIEW public.companies_public
WITH (security_invoker = true) AS
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
  c.updated_at
FROM companies c
WHERE EXISTS (
  SELECT 1 FROM user_company_roles ucr
  WHERE ucr.company_id = c.id
  AND ucr.user_id = (SELECT auth.uid())
  AND ucr.is_active = true
  AND (SELECT auth.role()) = 'authenticated'
  AND (SELECT auth.uid()) IS NOT NULL
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
);

-- Create secure companies_financial view with built-in security (restricted access)
CREATE VIEW public.companies_financial
WITH (security_invoker = true) AS
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
FROM companies c
WHERE EXISTS (
  SELECT 1 FROM user_company_roles ucr
  WHERE ucr.company_id = c.id
  AND ucr.user_id = (SELECT auth.uid())
  AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  AND ucr.is_active = true
  AND (SELECT auth.role()) = 'authenticated'
  AND (SELECT auth.uid()) IS NOT NULL
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
);

-- Create secure equipment_status_summary view with built-in security
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
FROM company_equipment ce
WHERE EXISTS (
  SELECT 1 FROM user_company_roles ucr
  WHERE ucr.company_id = ce.company_id
  AND ucr.user_id = (SELECT auth.uid())
  AND ucr.is_active = true
  AND (SELECT auth.role()) = 'authenticated'
  AND (SELECT auth.uid()) IS NOT NULL
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
);

-- Set proper permissions for authenticated users
GRANT SELECT ON public.companies_public TO authenticated;
GRANT SELECT ON public.companies_financial TO authenticated;
GRANT SELECT ON public.equipment_status_summary TO authenticated;

-- Revoke from public and anon for security
REVOKE ALL ON public.companies_public FROM public, anon;
REVOKE ALL ON public.companies_financial FROM public, anon;
REVOKE ALL ON public.equipment_status_summary FROM public, anon;