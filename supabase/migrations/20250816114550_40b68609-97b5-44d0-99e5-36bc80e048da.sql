-- Fix security issue in equipment_status_summary view
-- Since RLS cannot be enabled directly on views, we need to secure the underlying data source

-- The equipment_status_summary view is based on company_equipment table
-- Let's verify and optimize the view definition to ensure proper security

-- Drop the existing view to recreate it with better security
DROP VIEW IF EXISTS equipment_status_summary;

-- Recreate the view with explicit security checks and optimized auth functions
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
FROM company_equipment ce
WHERE 
  -- Security check: Only show equipment for companies user has access to
  -- Use optimized auth function calls
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND ce.company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
  );

-- Add security comment
COMMENT ON VIEW equipment_status_summary IS 'Secure equipment status summary view. Access automatically restricted to company members through WHERE clause filtering. Contains sensitive data including VIN numbers and financial information.';

-- Log this security fix
INSERT INTO deployment_log (
  deployment_id,
  event_type,
  status,
  event_data
) VALUES (
  'security-fix-equipment-view-' || extract(epoch from now())::text,
  'security_view_update',
  'completed',
  jsonb_build_object(
    'view', 'equipment_status_summary',
    'action', 'recreate_with_security_filter',
    'reason', 'fix_exposed_equipment_data_in_view',
    'security_method', 'where_clause_filtering',
    'timestamp', now()
  )
);