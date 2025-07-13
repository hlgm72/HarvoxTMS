-- Remove unnecessary contact fields from company_brokers table
ALTER TABLE public.company_brokers 
DROP COLUMN IF EXISTS contact_person,
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS phone;

-- Add email_domain field to store the client's email domain
ALTER TABLE public.company_brokers 
ADD COLUMN email_domain TEXT;

-- Add comment to document the field
COMMENT ON COLUMN public.company_brokers.email_domain IS 'Email domain of the client company (without @), often matches their website domain';