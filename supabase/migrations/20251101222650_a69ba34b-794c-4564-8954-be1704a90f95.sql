-- Add columns to store load number pattern metadata
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS load_number_pattern_description TEXT,
ADD COLUMN IF NOT EXISTS load_number_pattern_explanation TEXT,
ADD COLUMN IF NOT EXISTS load_number_pattern_examples JSONB;

COMMENT ON COLUMN public.companies.load_number_pattern_description IS 'User provided description of the load number format';
COMMENT ON COLUMN public.companies.load_number_pattern_explanation IS 'AI generated explanation of the pattern';
COMMENT ON COLUMN public.companies.load_number_pattern_examples IS 'JSON object with valid and invalid examples: {"valid": ["example1"], "invalid": ["example2"]}';