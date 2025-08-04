-- Add missing total_income column to driver_period_calculations table
ALTER TABLE public.driver_period_calculations 
ADD COLUMN total_income NUMERIC NOT NULL DEFAULT 0;

-- Update existing records to calculate total_income
UPDATE public.driver_period_calculations 
SET total_income = gross_earnings + other_income;