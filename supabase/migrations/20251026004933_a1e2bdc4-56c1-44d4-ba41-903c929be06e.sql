-- Remove redundant fields from load_stops table
-- These fields are now obtained from the facilities table via facility_id

ALTER TABLE public.load_stops DROP COLUMN IF EXISTS company_name;
ALTER TABLE public.load_stops DROP COLUMN IF EXISTS address;
ALTER TABLE public.load_stops DROP COLUMN IF EXISTS city;
ALTER TABLE public.load_stops DROP COLUMN IF EXISTS state;
ALTER TABLE public.load_stops DROP COLUMN IF EXISTS zip_code;
ALTER TABLE public.load_stops DROP COLUMN IF EXISTS reference_number;
ALTER TABLE public.load_stops DROP COLUMN IF EXISTS contact_name;
ALTER TABLE public.load_stops DROP COLUMN IF EXISTS contact_phone;