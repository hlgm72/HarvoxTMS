-- Drop existing views and recreate them with built-in security

-- Drop existing views
DROP VIEW IF EXISTS companies_basic_info;
DROP VIEW IF EXISTS companies_financial_data;
DROP VIEW IF EXISTS equipment_status_summary;

-- Create secure companies_basic_info view with access control
CREATE VIEW companies_basic_info
WITH (security_barrier = true, security_invoker = true)
AS
SELECT 
  id, name, street_address, state_id, zip_code, city, phone, email, 
  logo_url, plan_type, status, created_at, updated_at
FROM companies 
WHERE 
  -- Only show data if user has basic access to the company
  current_user = 'postgres' OR can_access_company_basic_data(id);

-- Create secure companies_financial_data view with access control  
CREATE VIEW companies_financial_data
WITH (security_barrier = true, security_invoker = true)
AS
SELECT 
  id, name, street_address, state_id, zip_code, city, phone, email,
  logo_url, plan_type, status, created_at, updated_at,
  -- Financial fields - only visible with proper access
  ein, owner_name, owner_email, owner_phone, owner_title,
  dot_number, mc_number, max_users, max_vehicles,
  default_payment_frequency, payment_cycle_start_day, payment_day,
  default_leasing_percentage, default_factoring_percentage, default_dispatching_percentage,
  load_assignment_criteria, contract_start_date
FROM companies 
WHERE 
  -- Only show data if user has financial access to the company
  current_user = 'postgres' OR can_access_company_financial_data(id);

-- Create secure equipment_status_summary view
CREATE VIEW equipment_status_summary
WITH (security_barrier = true, security_invoker = true)
AS
SELECT 
  ce.id, ce.company_id, ce.equipment_number, ce.equipment_type, ce.make, ce.model, ce.year,
  ce.vin_number, ce.license_plate, ce.fuel_type, ce.status, ce.purchase_date, ce.purchase_price,
  ce.current_mileage, ce.insurance_expiry_date, ce.registration_expiry_date,
  ce.license_plate_expiry_date, ce.annual_inspection_expiry_date, ce.notes,
  ce.created_at, ce.updated_at, ce.created_by, ce.updated_by, ce.geotab_vehicle_id,
  -- Status indicators
  CASE 
    WHEN ce.insurance_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.insurance_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as insurance_status,
  CASE 
    WHEN ce.registration_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.registration_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as registration_status,
  CASE 
    WHEN ce.license_plate_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.license_plate_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as license_status,
  CASE 
    WHEN ce.annual_inspection_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.annual_inspection_expiry_date < CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as inspection_status,
  -- Document counts
  (SELECT COUNT(*) FROM equipment_documents ed WHERE ed.equipment_id = ce.id AND ed.document_type = 'title') as has_title,
  (SELECT COUNT(*) FROM equipment_documents ed WHERE ed.equipment_id = ce.id AND ed.document_type = 'registration') as has_registration,
  (SELECT COUNT(*) FROM equipment_documents ed WHERE ed.equipment_id = ce.id AND ed.document_type = 'inspection') as has_inspection,
  (SELECT COUNT(*) FROM equipment_documents ed WHERE ed.equipment_id = ce.id AND ed.document_type = 'form_2290') as has_form_2290
FROM company_equipment ce
WHERE 
  -- Only show equipment if user has access to the company
  current_user = 'postgres' OR 
  (auth.uid() IS NOT NULL AND ce.company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  ));

-- Grant SELECT permissions to authenticated users only
GRANT SELECT ON companies_basic_info TO authenticated;
GRANT SELECT ON companies_financial_data TO authenticated;
GRANT SELECT ON equipment_status_summary TO authenticated;

-- Explicitly revoke any public access
REVOKE ALL ON companies_basic_info FROM PUBLIC;
REVOKE ALL ON companies_financial_data FROM PUBLIC;
REVOKE ALL ON equipment_status_summary FROM PUBLIC;