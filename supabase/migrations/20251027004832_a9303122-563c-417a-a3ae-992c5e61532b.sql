-- Modificar campos numéricos restantes en user_payrolls para usar precisión decimal de 2 lugares
-- Esto asegura consistencia en todos los campos monetarios

-- Cambiar gross_earnings a NUMERIC(10,2)
ALTER TABLE user_payrolls 
ALTER COLUMN gross_earnings TYPE NUMERIC(10,2);

-- Cambiar other_income a NUMERIC(10,2)
ALTER TABLE user_payrolls 
ALTER COLUMN other_income TYPE NUMERIC(10,2);

-- Cambiar fuel_expenses a NUMERIC(10,2)
ALTER TABLE user_payrolls 
ALTER COLUMN fuel_expenses TYPE NUMERIC(10,2);

-- Comentarios para documentar los cambios
COMMENT ON COLUMN user_payrolls.gross_earnings IS 'Ganancias brutas con precisión de 2 decimales';
COMMENT ON COLUMN user_payrolls.other_income IS 'Otros ingresos con precisión de 2 decimales';
COMMENT ON COLUMN user_payrolls.fuel_expenses IS 'Gastos de combustible con precisión de 2 decimales';