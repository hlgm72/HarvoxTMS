-- Modificar columnas en user_payrolls para usar precisión decimal de 2 lugares
-- Esto asegura que total_deductions y net_payment siempre muestren 2 decimales

-- Cambiar total_deductions a NUMERIC(10,2)
ALTER TABLE user_payrolls 
ALTER COLUMN total_deductions TYPE NUMERIC(10,2);

-- Cambiar net_payment a NUMERIC(10,2)
ALTER TABLE user_payrolls 
ALTER COLUMN net_payment TYPE NUMERIC(10,2);

-- Comentarios para documentar los cambios
COMMENT ON COLUMN user_payrolls.total_deductions IS 'Total de deducciones con precisión de 2 decimales';
COMMENT ON COLUMN user_payrolls.net_payment IS 'Pago neto con precisión de 2 decimales';