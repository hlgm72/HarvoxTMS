-- Limpiar payment_period_id de cargas sin conductor
-- Las cargas sin conductor no deberían tener período asignado
UPDATE loads
SET payment_period_id = NULL
WHERE driver_user_id IS NULL
  AND payment_period_id IS NOT NULL;