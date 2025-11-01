
-- Drop and recreate get_companies_basic_info to include load number pattern fields
DROP FUNCTION IF EXISTS public.get_companies_basic_info(uuid);

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
    
    -- Log access to specific company basic info
    PERFORM log_company_access_audit(
      target_company_id, 
      'basic_info', 
      ARRAY['name', 'address', 'contact', 'status', 'load_number_pattern']
    );
  ELSE
    -- Log access to all companies basic info
    PERFORM log_company_access_audit(
      NULL, 
      'basic_info_list', 
      ARRAY['name', 'address', 'contact', 'status', 'load_number_pattern']
    );
  END IF;

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
