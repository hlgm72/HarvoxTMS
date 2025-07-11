-- Update default leasing percentage from 25% to 5%
ALTER TABLE public.companies 
ALTER COLUMN default_leasing_percentage SET DEFAULT 5.00;

-- Update existing records that have the old default value
UPDATE public.companies 
SET default_leasing_percentage = 5.00 
WHERE default_leasing_percentage = 25.00;