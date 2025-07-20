-- Update payment_day column to store day of week instead of day of month
-- First add the new column
ALTER TABLE public.companies 
ADD COLUMN payment_day_of_week TEXT CHECK (payment_day_of_week IN ('monday', 'tuesday', 'wednesday', 'thursday', 'friday'));

-- Set default value based on existing payment_day
UPDATE public.companies 
SET payment_day_of_week = 'friday' 
WHERE payment_day_of_week IS NULL;

-- Make the new column NOT NULL with default
ALTER TABLE public.companies 
ALTER COLUMN payment_day_of_week SET NOT NULL,
ALTER COLUMN payment_day_of_week SET DEFAULT 'friday';

-- Drop the old payment_day column
ALTER TABLE public.companies 
DROP COLUMN payment_day;

-- Rename the new column to payment_day
ALTER TABLE public.companies 
RENAME COLUMN payment_day_of_week TO payment_day;