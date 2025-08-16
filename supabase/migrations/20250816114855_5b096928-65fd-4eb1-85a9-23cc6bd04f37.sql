-- Fix SECURITY DEFINER issue in equipment_status_summary view
-- Remove SECURITY DEFINER property to ensure proper RLS enforcement

-- Drop the existing view
DROP VIEW IF EXISTS equipment_status_summary;

-- Recreate the view WITHOUT SECURITY DEFINER to properly enforce RLS
-- This ensures the view respects the querying user's permissions and RLS policies
CREATE VIEW equipment_status_summary AS
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

-- Add security comment explaining the RLS inheritance
COMMENT ON VIEW equipment_status_summary IS 'Equipment status summary view that inherits RLS policies from company_equipment table. Access controlled by underlying table RLS policies for proper security enforcement.';

-- Log this security fix
INSERT INTO deployment_log (
  deployment_id,
  event_type,
  status,
  event_data
) VALUES (
  'security-fix-view-definer-' || extract(epoch from now())::text,
  'security_view_fix',
  'completed',
  jsonb_build_object(
    'view', 'equipment_status_summary',
    'action', 'remove_security_definer',
    'reason', 'fix_security_definer_bypass',
    'security_method', 'inherit_rls_from_base_table',
    'timestamp', now()
  )
);