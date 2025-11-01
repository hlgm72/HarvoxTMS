-- Update get_companies_basic_info to include load_number_pattern fields

DROP FUNCTION IF EXISTS get_companies_basic_info();

CREATE OR REPLACE FUNCTION get_companies_basic_info()
RETURNS TABLE (
  id uuid,
  name text,
  street_address text,
  city text,
  state_id char(2),
  zip_code varchar,
  phone text,
  email text,
  plan_type text,
  status text,
  created_at timestamptz,
  updated_at timestamptz,
  logo_url text,
  load_number_pattern text,
  load_number_pattern_description text,
  load_number_pattern_explanation text,
  load_number_pattern_examples jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check authentication
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Log access for audit
  INSERT INTO company_data_access_log (company_id, accessed_by, access_type, action)
  SELECT 
    c.id,
    auth.uid(),
    'basic_info',
    'view'
  FROM companies c
  WHERE (
    user_is_superadmin()
    OR c.id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
    )
  );

  -- Return data based on permissions
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    c.street_address,
    c.city,
    c.state_id,
    c.zip_code,
    c.phone,
    c.email,
    c.plan_type,
    c.status,
    c.created_at,
    c.updated_at,
    c.logo_url,
    c.load_number_pattern,
    c.load_number_pattern_description,
    c.load_number_pattern_explanation,
    c.load_number_pattern_examples
  FROM companies c
  WHERE (
    user_is_superadmin()
    OR c.id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
    )
  );
END;
$$;