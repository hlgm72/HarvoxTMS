-- Modificar gallons_purchased en fuel_expenses para usar precisión decimal de 2 lugares
-- Esto asegura que los galones siempre muestren 2 decimales

ALTER TABLE fuel_expenses 
ALTER COLUMN gallons_purchased TYPE NUMERIC(10,2);

-- Comentario para documentar el cambio
COMMENT ON COLUMN fuel_expenses.gallons_purchased IS 'Galones comprados con precisión de 2 decimales';