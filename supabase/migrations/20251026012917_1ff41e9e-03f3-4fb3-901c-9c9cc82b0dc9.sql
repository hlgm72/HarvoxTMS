-- Fix security issue: Set search_path for the function
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;