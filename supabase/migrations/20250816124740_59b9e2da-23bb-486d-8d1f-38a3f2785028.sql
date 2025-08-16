-- Fix security definer view warnings by changing to security invoker
-- This ensures views enforce permissions of the querying user, not the view creator

-- Update companies_basic_info view to use SECURITY INVOKER
DROP VIEW IF EXISTS companies_basic_info;

CREATE VIEW companies_basic_info 
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
  c.plan_type,
  c.status,
  c.created_at,
  c.updated_at
FROM companies c
WHERE validate_business_data_access('companies_basic', c.id, 'member');

-- Update equipment_status_summary view to use SECURITY INVOKER
DROP VIEW IF EXISTS equipment_status_summary;

CREATE VIEW equipment_status_summary 
WITH (security_invoker = true) AS
SELECT 
  ce.id,
  ce.company_id,
  ce.equipment_number,
  ce.equipment_type,
  ce.make,
  ce.model,
  ce.year,
  ce.vin_number,
  ce.license_plate,
  ce.fuel_type,
  ce.status,
  ce.purchase_date,
  ce.purchase_price,
  ce.current_mileage,
  ce.insurance_expiry_date,
  ce.registration_expiry_date,
  ce.license_plate_expiry_date,
  ce.annual_inspection_expiry_date,
  ce.notes,
  ce.geotab_vehicle_id,
  ce.created_at,
  ce.updated_at,
  ce.created_by,
  ce.updated_by,
  -- Document status indicators
  COUNT(ed_title.id) as has_title,
  COUNT(ed_registration.id) as has_registration,
  COUNT(ed_inspection.id) as has_inspection,
  COUNT(ed_form2290.id) as has_form_2290,
  -- Status calculations
  CASE 
    WHEN ce.insurance_expiry_date IS NULL THEN 'unknown'
    WHEN ce.insurance_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.insurance_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as insurance_status,
  CASE 
    WHEN ce.registration_expiry_date IS NULL THEN 'unknown'
    WHEN ce.registration_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.registration_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as registration_status,
  CASE 
    WHEN ce.license_plate_expiry_date IS NULL THEN 'unknown'
    WHEN ce.license_plate_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.license_plate_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as license_status,
  CASE 
    WHEN ce.annual_inspection_expiry_date IS NULL THEN 'unknown'
    WHEN ce.annual_inspection_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.annual_inspection_expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
    ELSE 'valid'
  END as inspection_status
FROM company_equipment ce
LEFT JOIN equipment_documents ed_title ON ce.id = ed_title.equipment_id 
  AND ed_title.document_type = 'title' 
  AND ed_title.is_current = true
LEFT JOIN equipment_documents ed_registration ON ce.id = ed_registration.equipment_id 
  AND ed_registration.document_type = 'registration' 
  AND ed_registration.is_current = true
LEFT JOIN equipment_documents ed_inspection ON ce.id = ed_inspection.equipment_id 
  AND ed_inspection.document_type = 'annual_inspection' 
  AND ed_inspection.is_current = true
LEFT JOIN equipment_documents ed_form2290 ON ce.id = ed_form2290.equipment_id 
  AND ed_form2290.document_type = 'form_2290' 
  AND ed_form2290.is_current = true
WHERE validate_business_data_access('equipment', ce.company_id, 'member')
GROUP BY ce.id, ce.company_id, ce.equipment_number, ce.equipment_type, ce.make, 
         ce.model, ce.year, ce.vin_number, ce.license_plate, ce.fuel_type, 
         ce.status, ce.purchase_date, ce.purchase_price, ce.current_mileage,
         ce.insurance_expiry_date, ce.registration_expiry_date, 
         ce.license_plate_expiry_date, ce.annual_inspection_expiry_date,
         ce.notes, ce.geotab_vehicle_id, ce.created_at, ce.updated_at,
         ce.created_by, ce.updated_by;