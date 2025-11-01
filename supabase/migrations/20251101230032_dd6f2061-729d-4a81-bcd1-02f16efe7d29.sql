
-- Fix get_companies_basic_info to handle NULL company_id in audit logging
CREATE OR REPLACE FUNCTION public.get_companies_basic_info(target_company_id UUID DEFAULT NULL)
RETURNS TABLE(
  id UUID,
  name TEXT,
  street_address TEXT,
  state_id CHAR(2),
  zip_code VARCHAR,
  city TEXT,
  phone TEXT,
  email TEXT,
  logo_url TEXT,
  plan_type TEXT,
  status TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  load_number_pattern TEXT,
  load_number_pattern_description TEXT,
  load_number_pattern_explanation TEXT,
  load_number_pattern_examples JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Validate user can access company data
  IF target_company_id IS NOT NULL THEN
    IF NOT user_can_access_company(target_company_id) THEN
      RAISE EXCEPTION 'Unauthorized access to company data';
    END IF;
    
    -- Log access to specific company basic info (only when company_id is not null)
    PERFORM log_company_access_audit(
      target_company_id, 
      'basic_info', 
      ARRAY['name', 'address', 'contact', 'status', 'load_number_pattern']
    );
  END IF;
  -- Note: We don't log when target_company_id is NULL to avoid violating not-null constraint

  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.street_address,
    c.state_id,
    c.zip_code,
    c.city,
    c.phone,
    c.email,
    c.logo_url,
    c.plan_type,
    c.status,
    c.created_at,
    c.updated_at,
    c.load_number_pattern,
    c.load_number_pattern_description,
    c.load_number_pattern_explanation,
    c.load_number_pattern_examples
  FROM companies c
  WHERE (target_company_id IS NULL OR c.id = target_company_id)
    AND user_can_access_company(c.id);
END;
$$;
