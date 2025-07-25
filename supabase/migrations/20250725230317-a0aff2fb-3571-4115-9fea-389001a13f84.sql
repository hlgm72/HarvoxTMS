-- Modificar la tabla fuel_expenses según los nuevos requerimientos

-- 1. Renombrar station_address a station_state para almacenar códigos de estado
ALTER TABLE public.fuel_expenses 
RENAME COLUMN station_address TO station_state;

-- 2. Cambiar el tipo y descripción del campo station_state
ALTER TABLE public.fuel_expenses 
ALTER COLUMN station_state TYPE VARCHAR(2);

-- 3. Eliminar fuel_card_number (redundante, se puede obtener de driver_cards)
ALTER TABLE public.fuel_expenses 
DROP COLUMN fuel_card_number;

-- 4. Renombrar authorization_code a invoice_number
ALTER TABLE public.fuel_expenses 
RENAME COLUMN authorization_code TO invoice_number;

-- 5. Eliminar wex_reference_id (no es necesario)
ALTER TABLE public.fuel_expenses 
DROP COLUMN wex_reference_id;

-- Agregar comentarios para documentar los cambios
COMMENT ON COLUMN public.fuel_expenses.station_state IS 'Código del estado donde se compró el combustible (ej: TX, CA, NY)';
COMMENT ON COLUMN public.fuel_expenses.invoice_number IS 'Número de factura que identifica de forma única cada transacción';