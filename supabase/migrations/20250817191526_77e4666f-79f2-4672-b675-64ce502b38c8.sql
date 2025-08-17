-- Security Fix: Restrict Driver Personal Information Access
-- Issue: Operations managers can access highly sensitive driver PII
-- Solution: Create granular access control with field-level restrictions

-- 1. Create more restrictive function for highly sensitive data access
CREATE OR REPLACE FUNCTION public.can_access_driver_highly_sensitive_data(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    -- Driver can access their own data
    WHEN target_user_id = auth.uid() THEN true
    -- ONLY company_owner and superadmin can access highly sensitive PII
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = target_user_id
      AND ucr1.is_active = true
      AND ucr2.user_id = auth.uid()
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'superadmin')
    ) THEN true
    ELSE false
  END;
$$;

-- 2. Create function for basic operational data (less sensitive)
CREATE OR REPLACE FUNCTION public.can_access_driver_operational_data(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    -- Driver can access their own data
    WHEN target_user_id = auth.uid() THEN true
    -- Operations managers can access basic operational data only
    WHEN EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = target_user_id
      AND ucr1.is_active = true
      AND ucr2.user_id = auth.uid()
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
    ) THEN true
    ELSE false
  END;
$$;

-- 3. Update existing function to be more restrictive for backwards compatibility
DROP FUNCTION IF EXISTS public.can_access_driver_sensitive_data(uuid);
CREATE OR REPLACE FUNCTION public.can_access_driver_sensitive_data(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  -- This now calls the highly sensitive function for maximum protection
  SELECT can_access_driver_highly_sensitive_data(target_user_id);
$$;

-- 4. Create secure view for basic driver information (operations managers can access)
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
CREATE POLICY "driver_basic_info_access" ON driver_basic_info
FOR SELECT
TO authenticated
USING (can_access_driver_operational_data(user_id));

-- 5. Create secure view for highly sensitive information (owners/superadmins only)
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
CREATE POLICY "driver_sensitive_info_restricted" ON driver_sensitive_info
FOR SELECT
TO authenticated
USING (can_access_driver_highly_sensitive_data(user_id));

-- 6. Update the main table RLS to be more restrictive
DROP POLICY IF EXISTS "driver_profiles_select_optimized" ON driver_profiles;

CREATE POLICY "driver_profiles_select_ultra_restricted" ON driver_profiles
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND (
    -- Driver can access their own data
    user_id = (SELECT auth.uid())
    OR
    -- Only company owners and superadmins can access full profiles
    can_access_driver_highly_sensitive_data(user_id)
  )
);

-- 7. Enhanced audit logging with field-level tracking
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

-- 8. Update the existing RPC functions to use the new security model
DROP FUNCTION IF EXISTS public.get_driver_basic_info(uuid);
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

-- 9. Restrict sensitive function to owners/superadmins only
DROP FUNCTION IF EXISTS public.get_driver_sensitive_info(uuid);
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