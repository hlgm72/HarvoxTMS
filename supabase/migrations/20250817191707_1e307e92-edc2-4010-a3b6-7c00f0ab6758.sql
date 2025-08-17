-- Security Fix: Restrict Driver Personal Information Access (Part 2 - Secure Views & Functions)
-- Create secure views and RPC functions for controlled access to driver data

-- 1. Enhanced audit logging with field-level tracking
CREATE OR REPLACE FUNCTION public.log_driver_data_access_detailed(
  target_user_id UUID, 
  access_type TEXT,
  fields_accessed TEXT[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO company_data_access_log (
    company_id,
    accessed_by,
    access_type,
    action,
    accessed_at
  )
  SELECT 
    ucr.company_id,
    auth.uid(),
    access_type || ' - Fields: ' || array_to_string(fields_accessed, ', '),
    'driver_pii_access',
    now()
  FROM user_company_roles ucr
  WHERE ucr.user_id = target_user_id
  AND ucr.is_active = true
  LIMIT 1;
END;
$$;

-- 2. Create secure view for basic driver information (operations managers can access)
CREATE OR REPLACE VIEW driver_basic_info AS
SELECT 
  user_id,
  cdl_class,
  license_expiry_date,
  is_active,
  created_at,
  updated_at
FROM driver_profiles
WHERE can_access_driver_operational_data(user_id);

-- Enable RLS on the view
ALTER VIEW driver_basic_info ENABLE ROW LEVEL SECURITY;

-- Create policy for the view
CREATE POLICY "driver_basic_info_operational_access" ON driver_basic_info
FOR SELECT
TO authenticated
USING (can_access_driver_operational_data(user_id));

-- 3. Create secure view for highly sensitive information (owners/superadmins only)
CREATE OR REPLACE VIEW driver_sensitive_info AS
SELECT 
  user_id,
  license_number,
  license_state,
  license_issue_date,
  license_expiry_date,
  cdl_class,
  cdl_endorsements,
  emergency_contact_name,
  emergency_contact_phone,
  driver_id
FROM driver_profiles
WHERE can_access_driver_highly_sensitive_data(user_id);

-- Enable RLS on the sensitive view
ALTER VIEW driver_sensitive_info ENABLE ROW LEVEL SECURITY;

-- Create policy for the sensitive view
CREATE POLICY "driver_sensitive_info_owners_only" ON driver_sensitive_info
FOR SELECT
TO authenticated
USING (can_access_driver_highly_sensitive_data(user_id));

-- 4. Create RPC function for basic driver info (operations managers can access)
CREATE OR REPLACE FUNCTION public.get_driver_basic_info(target_user_id UUID)
RETURNS TABLE(
  user_id UUID,
  cdl_class TEXT,
  license_expiry_date DATE,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check operational data access (allows operations managers)
  IF NOT can_access_driver_operational_data(target_user_id) THEN
    RAISE EXCEPTION 'Unauthorized access to driver operational data';
  END IF;

  -- Log access with specific fields
  PERFORM log_driver_data_access_detailed(
    target_user_id, 
    'driver_basic_info',
    ARRAY['cdl_class', 'license_expiry_date', 'is_active']
  );

  RETURN QUERY
  SELECT 
    dp.user_id,
    dp.cdl_class,
    dp.license_expiry_date,
    dp.is_active
  FROM driver_profiles dp
  WHERE dp.user_id = target_user_id;
END;
$$;

-- 5. Create RPC function for sensitive driver info (owners/superadmins only)
CREATE OR REPLACE FUNCTION public.get_driver_sensitive_info(target_user_id UUID)
RETURNS TABLE(
  user_id UUID,
  license_number TEXT,
  license_state CHAR(2),
  license_issue_date DATE,
  license_expiry_date DATE,
  cdl_class TEXT,
  cdl_endorsements TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  driver_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- STRICT access control - only owners and superadmins
  IF NOT can_access_driver_highly_sensitive_data(target_user_id) THEN
    RAISE EXCEPTION 'Access denied: Only company owners and superadmins can access sensitive driver PII';
  END IF;

  -- Log sensitive access with all fields accessed
  PERFORM log_driver_data_access_detailed(
    target_user_id, 
    'driver_sensitive_pii',
    ARRAY['license_number', 'license_state', 'emergency_contact_name', 'emergency_contact_phone', 'driver_id']
  );

  RETURN QUERY
  SELECT 
    dp.user_id,
    dp.license_number,
    dp.license_state,
    dp.license_issue_date,
    dp.license_expiry_date,
    dp.cdl_class,
    dp.cdl_endorsements,
    dp.emergency_contact_name,
    dp.emergency_contact_phone,
    dp.driver_id
  FROM driver_profiles dp
  WHERE dp.user_id = target_user_id;
END;
$$;

-- 6. Create backwards compatibility function (now ultra-restrictive)
CREATE OR REPLACE FUNCTION public.can_access_driver_sensitive_data(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- This now calls the highly sensitive function for maximum protection
  SELECT can_access_driver_highly_sensitive_data(target_user_id);
$$;