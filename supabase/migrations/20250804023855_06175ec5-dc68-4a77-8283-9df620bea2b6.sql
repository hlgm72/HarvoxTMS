-- Add missing net_payment column to driver_period_calculations table
ALTER TABLE public.driver_period_calculations 
ADD COLUMN net_payment NUMERIC NOT NULL DEFAULT 0;

-- Update existing records to calculate net_payment
-- net_payment = total_income - fuel_expenses - total_deductions
UPDATE public.driver_period_calculations 
SET net_payment = total_income - fuel_expenses - total_deductions;