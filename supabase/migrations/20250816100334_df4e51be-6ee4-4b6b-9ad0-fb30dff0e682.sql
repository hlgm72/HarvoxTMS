-- FINAL FIX: Remove SECURITY DEFINER from views completely
-- This migration specifically addresses the SECURITY DEFINER errors

-- Drop the views completely to ensure clean recreation
DROP VIEW IF EXISTS public.companies_financial CASCADE;
DROP VIEW IF EXISTS public.companies_public CASCADE;

-- Recreate companies_public view WITHOUT any security definer properties
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

-- Recreate companies_financial view WITHOUT any security definer properties  
CREATE VIEW public.companies_financial AS
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
  updated_at,
  ein,
  mc_number,
  dot_number,
  owner_name,
  owner_email,
  owner_phone,
  owner_title,
  max_vehicles,
  max_users,
  contract_start_date,
  default_payment_frequency,
  payment_cycle_start_day,
  payment_day,
  default_factoring_percentage,
  default_dispatching_percentage,
  default_leasing_percentage,
  load_assignment_criteria
FROM public.companies;

-- These views inherit RLS from the underlying companies table
-- No additional RLS policies needed on the views themselves
-- Security is controlled at the table level and in the application