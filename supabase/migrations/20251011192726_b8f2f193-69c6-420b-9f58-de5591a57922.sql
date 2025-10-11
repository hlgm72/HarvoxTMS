-- =====================================================
-- FIX DUPLICATE CONSTRAINT
-- Eliminar constraint duplicado en user_payment_periods
-- El índice driver_period_calculations_company_payment_period_id_driver_key
-- es en realidad un constraint UNIQUE que ya está duplicado por unique_user_per_company_period
-- =====================================================

ALTER TABLE public.user_payment_periods 
DROP CONSTRAINT IF EXISTS driver_period_calculations_company_payment_period_id_driver_key;