-- Agregar campo station_city a la tabla fuel_expenses
ALTER TABLE fuel_expenses 
ADD COLUMN station_city text;

-- Agregar comentario para documentar el campo
COMMENT ON COLUMN fuel_expenses.station_city IS 'Ciudad donde está ubicada la estación de combustible';

-- Crear índice para mejorar consultas por ciudad
CREATE INDEX idx_fuel_expenses_station_city ON fuel_expenses(station_city) 
WHERE station_city IS NOT NULL;