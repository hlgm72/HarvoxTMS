-- Fix function conflict by dropping existing function first
DROP FUNCTION IF EXISTS public.log_sensitive_company_access(uuid, text) CASCADE;

-- Create function to log sensitive company data access
CREATE OR REPLACE FUNCTION public.log_sensitive_company_access(company_id_param uuid, access_type_param text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  INSERT INTO company_sensitive_data_access_log (
    company_id, accessed_by, access_type, user_role, accessed_at
  )
  SELECT 
    company_id_param,
    auth.uid(),
    access_type_param,
    ucr.role,
    now()
  FROM user_company_roles ucr
  WHERE ucr.user_id = auth.uid()
  AND ucr.is_active = true
  LIMIT 1;
END;
$$;

-- Drop the problematic SELECT policy that might be too broad
DROP POLICY IF EXISTS "companies_select_own_company_only" ON public.companies;
DROP POLICY IF EXISTS "companies_sensitive_data_restricted" ON public.companies;

-- Create new restrictive SELECT policy for companies table that focuses on basic data only
CREATE POLICY "companies_basic_info_members_only"
ON public.companies
FOR SELECT
TO authenticated
USING (
  -- User must be authenticated and not anonymous
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    -- User belongs to this company (basic access)
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = companies.id
      AND ucr.is_active = true
    )
    OR
    -- User is superadmin (full access)
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.role = 'superadmin'
      AND ucr.is_active = true
    )
  )
);

-- Test that the new policy is working correctly
SELECT 'Policy test: ' || COUNT(*)::text || ' companies visible'
FROM companies;