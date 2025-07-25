-- Añadir campos adicionales para almacenar datos detallados de transacciones de combustible
-- Estos campos permiten registrar información completa extraída de PDFs de Wex/Fleetone/EFS

ALTER TABLE public.fuel_expenses 
ADD COLUMN gross_amount NUMERIC(10,2) NULL;

ALTER TABLE public.fuel_expenses 
ADD COLUMN discount_amount NUMERIC(10,2) NULL DEFAULT 0;

ALTER TABLE public.fuel_expenses 
ADD COLUMN fees NUMERIC(10,2) NULL DEFAULT 0;

-- Agregar comentarios para documentar los nuevos campos
COMMENT ON COLUMN public.fuel_expenses.gross_amount IS 'Monto bruto antes de descuentos y comisiones';
COMMENT ON COLUMN public.fuel_expenses.discount_amount IS 'Monto de descuento aplicado a la transacción';
COMMENT ON COLUMN public.fuel_expenses.fees IS 'Comisiones y tarifas aplicadas a la transacción';