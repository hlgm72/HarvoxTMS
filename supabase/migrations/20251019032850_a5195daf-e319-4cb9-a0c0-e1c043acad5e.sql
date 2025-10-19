-- Añadir campo para la fecha real en que se realizó el pago
-- Este campo permitirá registrar la fecha exacta del pago, diferente de paid_at que es cuando se marca en el sistema

ALTER TABLE user_payrolls 
ADD COLUMN IF NOT EXISTS actual_payment_date DATE;

COMMENT ON COLUMN user_payrolls.actual_payment_date IS 'Fecha real en que se realizó el pago al conductor (puede ser diferente de paid_at)';