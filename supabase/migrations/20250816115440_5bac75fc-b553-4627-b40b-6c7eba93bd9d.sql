-- Fix critical security issue in equipment_status_summary view
-- The view currently exposes all equipment data without proper access control
-- Add explicit WHERE clause to restrict access to company members only

-- Drop the current insecure view
DROP VIEW IF EXISTS equipment_status_summary CASCADE;

-- Recreate with proper security filtering
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
FROM company_equipment ce
WHERE 
  -- CRITICAL SECURITY: Only show equipment for companies user has access to
  -- Prevent competitors from accessing sensitive equipment data
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND ce.company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
  );

-- Grant proper permissions
GRANT SELECT ON equipment_status_summary TO authenticated;

-- Add security documentation
COMMENT ON VIEW equipment_status_summary IS 'SECURE: Equipment status summary view with company-based access control. Only shows equipment for companies where the user is an active member. Contains sensitive data including VIN numbers, purchase prices, and operational details that must be protected from competitors.';

-- Log this critical security fix
INSERT INTO deployment_log (
  deployment_id,
  event_type,
  status,
  event_data
) VALUES (
  'critical-security-fix-' || extract(epoch from now())::text,
  'critical_security_fix',
  'completed',
  jsonb_build_object(
    'view', 'equipment_status_summary',
    'action', 'add_company_access_control',
    'reason', 'prevent_competitor_data_theft',
    'security_level', 'critical',
    'data_protected', jsonb_build_array('vin_numbers', 'purchase_prices', 'license_plates', 'operational_status'),
    'access_control', 'company_membership_required',
    'timestamp', now()
  )
);