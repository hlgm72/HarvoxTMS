-- Remove odometer_reading column from fuel_expenses table
ALTER TABLE public.fuel_expenses DROP COLUMN IF EXISTS odometer_reading;