-- ========================================
-- SECURITY FIX: Drop conflicting functions and secure companies_basic_info
-- ========================================

-- Drop any existing conflicting functions
DROP FUNCTION IF EXISTS public.get_companies_basic_info();
DROP FUNCTION IF EXISTS public.get_companies_basic_info(uuid);
DROP FUNCTION IF EXISTS public.get_companies_basic_info(text);

-- Drop the insecure view
DROP VIEW IF EXISTS public.companies_basic_info;

-- Create a new RPC function for secure company basic info access
CREATE OR REPLACE FUNCTION public.get_companies_basic_info()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL OR COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = true THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Get companies the user has access to
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', c.id,
      'name', c.name,
      'street_address', c.street_address,
      'state_id', c.state_id,
      'zip_code', c.zip_code,
      'city', c.city,
      'phone', c.phone,
      'email', c.email,
      'plan_type', c.plan_type,
      'status', c.status,
      'logo_url', c.logo_url,
      'created_at', c.created_at,
      'updated_at', c.updated_at
    )
  ) INTO result
  FROM companies c
  WHERE 
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
    );

  -- Log access for auditing
  PERFORM log_company_data_access(
    (SELECT unnest(array_agg(c.id)) FROM companies c 
     WHERE c.id IN (
       SELECT ucr.company_id FROM user_company_roles ucr
       WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
     )),
    'basic_info',
    'list'
  );

  RETURN COALESCE(result, '[]'::jsonb);
END;
$$;

-- Set proper permissions
GRANT EXECUTE ON FUNCTION public.get_companies_basic_info() TO authenticated;
REVOKE ALL ON FUNCTION public.get_companies_basic_info() FROM anon, public;

-- Add documentation
COMMENT ON FUNCTION public.get_companies_basic_info() IS 
'Secure function that returns basic company information with proper access control. Only returns companies that the authenticated user has access to.';

-- ========================================
-- ALTERNATIVE: Create secure view with RLS
-- ========================================

-- Create a properly secured view
CREATE VIEW public.companies_basic_info AS
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
  -- Apply same security as underlying table
  (
    auth.uid() IS NOT NULL 
    AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
    AND (
      -- User must be a member of this company OR superadmin
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
    )
  );

-- Enable RLS on the view (if supported)
ALTER VIEW public.companies_basic_info SET (security_invoker = true);

-- Set proper permissions
GRANT SELECT ON public.companies_basic_info TO authenticated;
REVOKE ALL ON public.companies_basic_info FROM anon, public;

-- Add documentation
COMMENT ON VIEW public.companies_basic_info IS 
'Secure view of basic company information. Access is restricted to company members and superadmins only through WHERE clause filtering.';

-- ========================================
-- TEST SECURITY
-- ========================================

-- Verify the view returns empty for non-authenticated users
-- This should return 0 rows when not authenticated
-- SELECT COUNT(*) FROM companies_basic_info;