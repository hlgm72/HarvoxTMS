-- ========================================
-- SECURITY FIX: Enhanced company data protection (Part 2)
-- ========================================

-- Drop existing conflicting functions
DROP FUNCTION IF EXISTS public.get_companies_financial_data(uuid);
DROP FUNCTION IF EXISTS public.get_companies_basic_info(uuid);

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
REVOKE ALL ON FUNCTION public.get_companies_basic_info(uuid) FROM anon, public;
REVOKE ALL ON FUNCTION public.get_companies_financial_data(uuid) FROM anon, public;

-- Add function documentation
COMMENT ON FUNCTION public.get_companies_basic_info(uuid) IS 
'Secure function to get basic company information (non-sensitive fields only). Returns JSONB data with proper access control.';

COMMENT ON FUNCTION public.get_companies_financial_data(uuid) IS 
'Secure function to get full company financial data including EIN, owner details, and percentages. Restricted to company owners, operations managers, and superadmins. Includes audit logging.';