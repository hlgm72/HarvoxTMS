-- Estandarizar todos los campos de estado a character(2)
-- Esto mejorará la consistencia, performance e integridad de datos

-- Primero verificar que no hay datos inválidos (más de 2 caracteres)
DO $$
BEGIN
  -- Verificar fuel_expenses.station_state
  IF EXISTS (
    SELECT 1 FROM fuel_expenses 
    WHERE station_state IS NOT NULL AND LENGTH(station_state) > 2
  ) THEN
    RAISE EXCEPTION 'Hay valores en fuel_expenses.station_state con más de 2 caracteres';
  END IF;
  
  -- Verificar profiles.state_id
  IF EXISTS (
    SELECT 1 FROM profiles 
    WHERE state_id IS NOT NULL AND LENGTH(state_id) > 2
  ) THEN
    RAISE EXCEPTION 'Hay valores en profiles.state_id con más de 2 caracteres';
  END IF;
  
  -- Verificar equipment_locations.state
  IF EXISTS (
    SELECT 1 FROM equipment_locations 
    WHERE state IS NOT NULL AND LENGTH(state) > 2
  ) THEN
    RAISE EXCEPTION 'Hay valores en equipment_locations.state con más de 2 caracteres';
  END IF;
  
  -- Verificar load_stops.state
  IF EXISTS (
    SELECT 1 FROM load_stops 
    WHERE state IS NOT NULL AND LENGTH(state) > 2
  ) THEN
    RAISE EXCEPTION 'Hay valores en load_stops.state con más de 2 caracteres';
  END IF;
END $$;

-- 1. Cambiar fuel_expenses.station_state de character varying(2) a character(2)
ALTER TABLE fuel_expenses 
ALTER COLUMN station_state TYPE character(2);

-- 2. Cambiar profiles.state_id de text a character(2)
ALTER TABLE profiles 
ALTER COLUMN state_id TYPE character(2);

-- 3. Cambiar equipment_locations.state de text a character(2)
ALTER TABLE equipment_locations 
ALTER COLUMN state TYPE character(2);

-- 4. Cambiar load_stops.state de text a character(2)
ALTER TABLE load_stops 
ALTER COLUMN state TYPE character(2);

-- Crear restricciones de validación para asegurar códigos de estado válidos
-- (Solo caracteres alfabéticos en mayúsculas)

ALTER TABLE fuel_expenses 
ADD CONSTRAINT fuel_expenses_station_state_format 
CHECK (station_state ~ '^[A-Z]{2}$' OR station_state IS NULL);

ALTER TABLE profiles 
ADD CONSTRAINT profiles_state_id_format 
CHECK (state_id ~ '^[A-Z]{2}$' OR state_id IS NULL);

ALTER TABLE equipment_locations 
ADD CONSTRAINT equipment_locations_state_format 
CHECK (state ~ '^[A-Z]{2}$' OR state IS NULL);

ALTER TABLE load_stops 
ADD CONSTRAINT load_stops_state_format 
CHECK (state ~ '^[A-Z]{2}$' OR state IS NULL);

-- Comentario final
COMMENT ON CONSTRAINT fuel_expenses_station_state_format ON fuel_expenses IS 'Ensure station_state is a valid 2-character uppercase state code';
COMMENT ON CONSTRAINT profiles_state_id_format ON profiles IS 'Ensure state_id is a valid 2-character uppercase state code';
COMMENT ON CONSTRAINT equipment_locations_state_format ON equipment_locations IS 'Ensure state is a valid 2-character uppercase state code';
COMMENT ON CONSTRAINT load_stops_state_format ON load_stops IS 'Ensure state is a valid 2-character uppercase state code';