-- Add unique constraint on facility name per company
-- This ensures that facility names are unique within each company
-- Prevents confusion and enforces clear naming for different locations

-- First, let's check if there are any duplicate names that would violate the constraint
-- We'll need to handle them before adding the constraint

-- Add unique constraint on (company_id, name)
ALTER TABLE facilities 
ADD CONSTRAINT facilities_company_name_unique 
UNIQUE (company_id, name);

-- Add index for better query performance when searching by name
CREATE INDEX IF NOT EXISTS idx_facilities_company_name 
ON facilities(company_id, name);

-- Update the validation to be case-insensitive and trim whitespace
-- This function will be used to check for duplicate names
CREATE OR REPLACE FUNCTION check_facility_name_unique()
RETURNS TRIGGER AS $$
BEGIN
  -- Normalize the name (trim and lowercase) for comparison
  NEW.name = TRIM(NEW.name);
  
  -- Check if a facility with the same normalized name already exists
  IF EXISTS (
    SELECT 1 
    FROM facilities 
    WHERE company_id = NEW.company_id 
    AND LOWER(TRIM(name)) = LOWER(TRIM(NEW.name))
    AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ) THEN
    RAISE EXCEPTION 'Ya existe una facility con el nombre "%". Por favor use un nombre diferente.', NEW.name
      USING HINT = 'Si es una ubicación diferente de la misma empresa, agregue información adicional al nombre (ej: "Amazon - Dallas Warehouse")';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to enforce unique names (case-insensitive)
DROP TRIGGER IF EXISTS trigger_check_facility_name_unique ON facilities;
CREATE TRIGGER trigger_check_facility_name_unique
  BEFORE INSERT OR UPDATE OF name ON facilities
  FOR EACH ROW
  EXECUTE FUNCTION check_facility_name_unique();