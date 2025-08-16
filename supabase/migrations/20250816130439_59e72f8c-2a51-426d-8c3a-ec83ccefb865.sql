-- Drop and recreate views with proper security restrictions

-- Drop existing views
DROP VIEW IF EXISTS companies_basic_info;
DROP VIEW IF EXISTS companies_financial_data;
DROP VIEW IF EXISTS equipment_status_summary;

-- Recreate companies_basic_info view with security
CREATE VIEW companies_basic_info 
WITH (security_barrier=true, security_invoker=true) AS
SELECT 
  id, name, street_address, city, state_id, zip_code, 
  phone, email, logo_url, plan_type, status, 
  created_at, updated_at
FROM companies
WHERE can_access_company_basic_data(id);

-- Recreate companies_financial_data view with security
CREATE VIEW companies_financial_data 
WITH (security_barrier=true, security_invoker=true) AS
SELECT 
  id, name, street_address, city, state_id, zip_code, 
  phone, email, logo_url, plan_type, status, 
  created_at, updated_at,
  -- Financial fields only for authorized users
  ein, owner_name, owner_email, owner_phone, owner_title,
  dot_number, mc_number,
  default_payment_frequency, payment_cycle_start_day, payment_day,
  default_leasing_percentage, default_factoring_percentage, default_dispatching_percentage,
  load_assignment_criteria, contract_start_date, max_users, max_vehicles
FROM companies
WHERE can_access_company_financial_data(id);

-- Recreate equipment_status_summary view with security
CREATE VIEW equipment_status_summary 
WITH (security_barrier=true, security_invoker=true) AS
SELECT 
  ce.*,
  CASE WHEN ce.insurance_expiry_date < CURRENT_DATE THEN 'expired'
       WHEN ce.insurance_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
       ELSE 'valid' END as insurance_status,
  CASE WHEN ce.registration_expiry_date < CURRENT_DATE THEN 'expired'
       WHEN ce.registration_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
       ELSE 'valid' END as registration_status,
  CASE WHEN ce.license_plate_expiry_date < CURRENT_DATE THEN 'expired'
       WHEN ce.license_plate_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
       ELSE 'valid' END as license_status,
  CASE WHEN ce.annual_inspection_expiry_date < CURRENT_DATE THEN 'expired'
       WHEN ce.annual_inspection_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
       ELSE 'valid' END as inspection_status,
  CASE WHEN EXISTS (
    SELECT 1 FROM equipment_documents ed 
    WHERE ed.equipment_id = ce.id 
    AND ed.document_type = 'title' 
    AND ed.is_current = true
  ) THEN 1 ELSE 0 END as has_title,
  CASE WHEN EXISTS (
    SELECT 1 FROM equipment_documents ed 
    WHERE ed.equipment_id = ce.id 
    AND ed.document_type = 'registration' 
    AND ed.is_current = true
  ) THEN 1 ELSE 0 END as has_registration,
  CASE WHEN EXISTS (
    SELECT 1 FROM equipment_documents ed 
    WHERE ed.equipment_id = ce.id 
    AND ed.document_type = 'inspection' 
    AND ed.is_current = true
  ) THEN 1 ELSE 0 END as has_inspection,
  CASE WHEN EXISTS (
    SELECT 1 FROM equipment_documents ed 
    WHERE ed.equipment_id = ce.id 
    AND ed.document_type = 'form_2290' 
    AND ed.is_current = true
  ) THEN 1 ELSE 0 END as has_form_2290
FROM company_equipment ce
WHERE ce.company_id IN (
  SELECT ucr.company_id 
  FROM user_company_roles ucr 
  WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
) OR current_user = 'postgres';

-- Revoke all public access and grant to authenticated only
REVOKE ALL ON companies_basic_info FROM PUBLIC;
REVOKE ALL ON companies_financial_data FROM PUBLIC; 
REVOKE ALL ON equipment_status_summary FROM PUBLIC;

GRANT SELECT ON companies_basic_info TO authenticated;
GRANT SELECT ON companies_financial_data TO authenticated;
GRANT SELECT ON equipment_status_summary TO authenticated;