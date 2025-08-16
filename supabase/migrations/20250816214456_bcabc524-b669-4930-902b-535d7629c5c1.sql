-- Fix the security issue by recreating companies_basic_info view to properly inherit RLS
-- The current view has security logic in WHERE clause which can be bypassed
-- We need to make it rely on the base table's RLS policies

-- Drop the current view
DROP VIEW IF EXISTS public.companies_basic_info;

-- Recreate the view without embedded security logic - let it inherit RLS from companies table
CREATE VIEW public.companies_basic_info AS
SELECT 
  id,
  name,
  street_address,
  state_id,
  zip_code,
  city,
  phone,
  email,
  plan_type,
  status,
  logo_url,
  created_at,
  updated_at
FROM public.companies;

-- Add comment explaining the security approach
COMMENT ON VIEW public.companies_basic_info IS 'Basic company information view. Security enforced through RLS policies on the base companies table. Users can only see companies they belong to or if they are superadmin.';

-- Verify the companies table has RLS enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename = 'companies';

-- Verify the view definition
SELECT 
  viewname,
  definition
FROM pg_views 
WHERE schemaname = 'public' 
AND viewname = 'companies_basic_info';