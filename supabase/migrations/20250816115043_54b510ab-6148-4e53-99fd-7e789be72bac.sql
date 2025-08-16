-- Force complete recreation of equipment_status_summary view
-- The linter still detects SECURITY DEFINER, so we need to ensure it's completely removed

-- First, drop the view completely with CASCADE to remove any dependencies
DROP VIEW IF EXISTS equipment_status_summary CASCADE;

-- Now recreate the view with explicit SECURITY INVOKER (opposite of SECURITY DEFINER)
-- This ensures the view runs with the privileges of the invoking user, not the view creator
CREATE VIEW equipment_status_summary 
WITH (security_invoker = true)
AS
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
  -- Insurance status calculation
  CASE
    WHEN ce.insurance_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.insurance_expiry_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 'expiring'
    ELSE 'valid'
  END AS insurance_status,
  -- Registration status calculation
  CASE
    WHEN ce.registration_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.registration_expiry_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 'expiring'
    ELSE 'valid'
  END AS registration_status,
  -- License status calculation
  CASE
    WHEN ce.license_plate_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.license_plate_expiry_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 'expiring'
    ELSE 'valid'
  END AS license_status,
  -- Inspection status calculation
  CASE
    WHEN ce.annual_inspection_expiry_date < CURRENT_DATE THEN 'expired'
    WHEN ce.annual_inspection_expiry_date <= (CURRENT_DATE + INTERVAL '30 days') THEN 'expiring'
    ELSE 'valid'
  END AS inspection_status,
  -- Document existence flags (placeholder for future implementation)
  0::bigint AS has_title,
  0::bigint AS has_registration,
  0::bigint AS has_inspection,
  0::bigint AS has_form_2290
FROM company_equipment ce;

-- Add security comment explaining the security_invoker setting
COMMENT ON VIEW equipment_status_summary IS 'Equipment status summary view with SECURITY INVOKER. Inherits RLS policies from company_equipment table and runs with querying user privileges for proper security enforcement.';

-- Log this complete security fix
INSERT INTO deployment_log (
  deployment_id,
  event_type,
  status,
  event_data
) VALUES (
  'security-fix-view-invoker-' || extract(epoch from now())::text,
  'security_view_complete_fix',
  'completed',
  jsonb_build_object(
    'view', 'equipment_status_summary',
    'action', 'recreate_with_security_invoker',
    'reason', 'remove_security_definer_completely',
    'security_method', 'explicit_security_invoker',
    'timestamp', now()
  )
);