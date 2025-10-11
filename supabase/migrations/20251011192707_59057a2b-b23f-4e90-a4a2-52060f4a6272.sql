-- =====================================================
-- FIX DUPLICATE INDEX/CONSTRAINT
-- Eliminar constraint duplicado en user_payment_periods
-- El índice "driver_period_calculations_company_payment_period_id_driver_key" 
-- es respaldado por un constraint, así que eliminamos el constraint
-- =====================================================

ALTER TABLE public.user_payment_periods 
DROP CONSTRAINT IF EXISTS driver_period_calculations_company_payment_period_id_driver_key;