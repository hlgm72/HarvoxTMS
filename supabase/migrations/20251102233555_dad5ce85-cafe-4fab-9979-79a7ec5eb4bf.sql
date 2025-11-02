-- Make vehicle_id required in fuel_expenses table
-- Update NULL vehicle_id values with the first available vehicle from the driver's company

UPDATE fuel_expenses fe
SET vehicle_id = (
  SELECT ce.id 
  FROM company_equipment ce
  WHERE ce.company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = fe.driver_user_id 
      AND is_active = true
    LIMIT 1
  )
  AND ce.equipment_type = 'truck'
  LIMIT 1
)
WHERE vehicle_id IS NULL;

-- Delete any fuel_expenses that still have NULL vehicle_id (no vehicles available for company)
DELETE FROM fuel_expenses WHERE vehicle_id IS NULL;

-- Now make the column NOT NULL
ALTER TABLE fuel_expenses 
ALTER COLUMN vehicle_id SET NOT NULL;