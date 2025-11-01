-- Add load_number_pattern column to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS load_number_pattern TEXT;

COMMENT ON COLUMN public.companies.load_number_pattern IS 'Regex pattern for validating load numbers format';
