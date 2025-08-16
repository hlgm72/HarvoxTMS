-- Fix the security issue by properly dropping and recreating functions
-- Need to drop existing functions first due to return type changes

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.get_companies_basic_info(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_companies_financial_data(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_company_with_owner_details(uuid) CASCADE;

-- Also drop any views that might still exist
DROP VIEW IF EXISTS public.companies_basic_info CASCADE;
DROP VIEW IF EXISTS public.companies_secure CASCADE; 
DROP VIEW IF EXISTS public.companies_with_owner_info CASCADE;

-- Create secure RPC function for basic company info
CREATE OR REPLACE FUNCTION public.get_companies_basic_info(company_id_param uuid DEFAULT NULL)
RETURNS TABLE (
  id uuid,
  name text,
  street_address text,
  state_id char(2),
  zip_code varchar,
  city text,
  phone text,
  email text,
  logo_url text,
  plan_type text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Verify user is authenticated
  IF auth.uid() IS NULL OR COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = true THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Check if user has access to company data
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND (
      company_id_param IS NULL 
      OR ucr.company_id = company_id_param
      OR ucr.role = 'superadmin'
    )
  ) THEN
    RAISE EXCEPTION 'Insufficient permissions to access company data';
  END IF;

  -- Return basic company info based on user permissions
  RETURN QUERY
  SELECT 
    c.id, c.name, c.street_address, c.state_id, c.zip_code,
    c.city, c.phone, c.email, c.logo_url, c.plan_type,
    c.status, c.created_at, c.updated_at
  FROM companies c
  JOIN user_company_roles ucr ON c.id = ucr.company_id
  WHERE ucr.user_id = auth.uid()
  AND ucr.is_active = true
  AND (company_id_param IS NULL OR c.id = company_id_param)
  
  UNION ALL
  
  -- Superadmin can see all companies
  SELECT 
    c.id, c.name, c.street_address, c.state_id, c.zip_code,
    c.city, c.phone, c.email, c.logo_url, c.plan_type,
    c.status, c.created_at, c.updated_at
  FROM companies c
  WHERE EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  )
  AND (company_id_param IS NULL OR c.id = company_id_param)
  AND NOT EXISTS (
    -- Avoid duplicates from the first query
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.company_id = c.id
    AND ucr.is_active = true
    AND ucr.role != 'superadmin'
  );
END;
$$;