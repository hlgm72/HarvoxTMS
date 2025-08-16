-- Fix SECURITY DEFINER errors on views by recreating them without SECURITY DEFINER

-- Drop existing views if they exist
DROP VIEW IF EXISTS public.companies_financial;
DROP VIEW IF EXISTS public.companies_public;

-- Recreate companies_public view (basic information, safe for all company users)
CREATE VIEW public.companies_public AS
SELECT 
  id,
  name,
  street_address,
  state_id,
  zip_code,
  city,
  phone,
  email,
  logo_url,
  plan_type,
  status,
  created_at,
  updated_at
FROM public.companies;

-- Recreate companies_financial view (sensitive financial data, restricted access)
CREATE VIEW public.companies_financial AS
SELECT *
FROM public.companies;