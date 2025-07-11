-- Add logo_url field to companies table
ALTER TABLE public.companies 
ADD COLUMN logo_url TEXT;

-- Add comment to document the field
COMMENT ON COLUMN public.companies.logo_url IS 'URL to the company logo image stored in Supabase Storage';