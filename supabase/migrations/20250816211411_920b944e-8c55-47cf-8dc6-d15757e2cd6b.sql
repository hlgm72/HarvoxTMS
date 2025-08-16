-- ========================================
-- SECURITY FIX: Secure companies_basic_info view
-- ========================================

-- Drop the current view that's not properly secured
DROP VIEW IF EXISTS public.companies_basic_info;

-- Create a security definer function to get basic company info
CREATE OR REPLACE FUNCTION public.get_companies_basic_info()
RETURNS TABLE(
  id uuid,
  name text,
  street_address text,
  state_id char(2),
  zip_code varchar,
  city text,
  phone text,
  email text,
  plan_type text,
  status text,
  logo_url text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  -- This function enforces company access control at the function level
  SELECT 
    c.id,
    c.name,
    c.street_address,
    c.state_id,
    c.zip_code,
    c.city,
    c.phone,
    c.email,
    c.plan_type,
    c.status,
    c.logo_url,
    c.created_at,
    c.updated_at
  FROM companies c
  WHERE 
    -- User must be authenticated and non-anonymous
    auth.uid() IS NOT NULL
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
    AND (
      -- User must have access to this company (be a member) OR be superadmin
      c.id IN (
        SELECT ucr.company_id
        FROM user_company_roles ucr
        WHERE ucr.user_id = auth.uid()
        AND ucr.is_active = true
      )
      OR EXISTS (
        SELECT 1 FROM user_company_roles
        WHERE user_id = auth.uid()
        AND role = 'superadmin'
        AND is_active = true
      )
    );
$$;

-- Create the view using the secure function
CREATE VIEW public.companies_basic_info AS
SELECT * FROM public.get_companies_basic_info();

-- Set proper permissions
GRANT SELECT ON public.companies_basic_info TO authenticated;
REVOKE ALL ON public.companies_basic_info FROM anon, public;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION public.get_companies_basic_info() TO authenticated;
REVOKE ALL ON FUNCTION public.get_companies_basic_info() FROM anon, public;

-- Add documentation
COMMENT ON VIEW public.companies_basic_info IS 
'Secure view of basic company information. Access is restricted to company members and superadmins only.';

COMMENT ON FUNCTION public.get_companies_basic_info() IS 
'Security function that returns basic company information with proper access control. Only returns companies that the authenticated user has access to.';

-- ========================================
-- LOG ACCESS FOR AUDITING
-- ========================================

-- Create trigger function to log access to basic company info
CREATE OR REPLACE FUNCTION public.audit_basic_company_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log access to company basic info for auditing
  INSERT INTO company_data_access_log (
    company_id,
    accessed_by,
    access_type,
    action
  ) VALUES (
    NEW.id,
    auth.uid(),
    'basic_info',
    'view'
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the main operation if logging fails
  RETURN NEW;
END;
$$;