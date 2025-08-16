-- ========================================
-- SECURITY FIX: Enhanced company data protection with field-level security
-- ========================================

-- Create secure views for different access levels
-- 1. Basic company info for all company users
CREATE OR REPLACE VIEW public.companies_public AS
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
FROM companies c
WHERE 
  -- User must be authenticated and non-anonymous
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    -- User must be a member of this company OR superadmin
    c.id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  );

-- 2. Financial company data for owners/operations managers only
CREATE OR REPLACE VIEW public.companies_financial AS
SELECT 
  c.*
FROM companies c
WHERE 
  -- User must be authenticated and non-anonymous
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND (
    -- User must be owner/operations manager of this company OR superadmin
    EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND company_id = c.id
      AND role IN ('company_owner', 'operations_manager')
      AND is_active = true
    )
    OR EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = (SELECT auth.uid())
      AND role = 'superadmin'
      AND is_active = true
    )
  );

-- Set proper permissions on views
GRANT SELECT ON public.companies_public TO authenticated;
GRANT SELECT ON public.companies_financial TO authenticated;
REVOKE ALL ON public.companies_public FROM anon, public;
REVOKE ALL ON public.companies_financial FROM anon, public;

-- Create audit function for sensitive data access
CREATE OR REPLACE FUNCTION public.can_access_company_financial_data(company_id_param uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = company_id_param
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) OR EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  );
$$;

-- Create audit logging trigger
CREATE OR REPLACE FUNCTION public.audit_company_data_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Log access to sensitive company data
  INSERT INTO company_data_access_log (
    company_id,
    accessed_by,
    access_type,
    action
  ) VALUES (
    NEW.id,
    auth.uid(),
    'financial_data',
    'view'
  );
  
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail the main operation if logging fails
  RETURN NEW;
END;
$$;

-- Add comments for documentation
COMMENT ON VIEW public.companies_public IS 
'Public view of company data excluding sensitive financial information. Accessible to all company members.';

COMMENT ON VIEW public.companies_financial IS 
'Full company data including sensitive financial information (EIN, owner details, percentages). Restricted to company owners, operations managers, and superadmins only.';

COMMENT ON FUNCTION public.can_access_company_financial_data(uuid) IS 
'Security function to check if current user can access sensitive financial company data.';

-- Create RPC functions for secure data access
CREATE OR REPLACE FUNCTION public.get_companies_basic_info(company_id_param uuid DEFAULT NULL)
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
  IF (SELECT auth.uid()) IS NULL OR COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = true THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Get basic company data
  IF company_id_param IS NOT NULL THEN
    SELECT to_jsonb(cp.*) INTO result
    FROM companies_public cp
    WHERE cp.id = company_id_param;
    
    RETURN COALESCE(result, 'null'::jsonb);
  ELSE
    SELECT jsonb_agg(to_jsonb(cp.*)) INTO result
    FROM companies_public cp;
    
    RETURN COALESCE(result, '[]'::jsonb);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_companies_financial_data(company_id_param uuid DEFAULT NULL)
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
  IF (SELECT auth.uid()) IS NULL OR COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) = true THEN
    RETURN '[]'::jsonb;
  END IF;

  -- Get financial company data (with access control)
  IF company_id_param IS NOT NULL THEN
    SELECT to_jsonb(cf.*) INTO result
    FROM companies_financial cf
    WHERE cf.id = company_id_param;
    
    -- Log access to sensitive data
    IF result IS NOT NULL THEN
      PERFORM log_company_data_access(company_id_param, 'financial_data', 'view');
    END IF;
    
    RETURN COALESCE(result, 'null'::jsonb);
  ELSE
    SELECT jsonb_agg(to_jsonb(cf.*)) INTO result
    FROM companies_financial cf;
    
    RETURN COALESCE(result, '[]'::jsonb);
  END IF;
END;
$$;

-- Set permissions on functions
GRANT EXECUTE ON FUNCTION public.get_companies_basic_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_companies_financial_data(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_company_financial_data(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.get_companies_basic_info(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.get_companies_financial_data(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.can_access_company_financial_data(uuid) FROM anon, public;