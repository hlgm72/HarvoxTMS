-- Create enhanced security for driver personal information
-- This addresses the security finding about potential unauthorized access to sensitive driver data

-- Create secure functions for driver data access
CREATE OR REPLACE FUNCTION public.can_access_driver_sensitive_data(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    -- Driver can access their own data
    WHEN target_user_id = auth.uid() THEN true
    -- Only company_owner and superadmin can access driver sensitive data
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

-- Create function to log sensitive driver data access
CREATE OR REPLACE FUNCTION public.log_driver_sensitive_access(target_user_id UUID, access_type TEXT)
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
    action
  )
  SELECT 
    ucr.company_id,
    auth.uid(),
    access_type,
    'driver_sensitive_data_access'
  FROM user_company_roles ucr
  WHERE ucr.user_id = target_user_id
  AND ucr.is_active = true
  LIMIT 1;
END;
$$;

-- Create secure RPC function for driver basic info (less sensitive)
CREATE OR REPLACE FUNCTION public.get_driver_basic_info(target_user_id UUID)
RETURNS TABLE(
  user_id UUID,
  license_expiry_date DATE,
  cdl_class TEXT,
  is_active BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Check if user can access this driver's data
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr1
    JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
    WHERE ucr1.user_id = target_user_id
    AND ucr1.is_active = true
    AND ucr2.user_id = auth.uid()
    AND ucr2.is_active = true
  ) THEN
    RAISE EXCEPTION 'Unauthorized access to driver data';
  END IF;

  -- Log basic access
  PERFORM log_driver_sensitive_access(target_user_id, 'driver_basic_info');

  RETURN QUERY
  SELECT 
    dp.user_id,
    dp.license_expiry_date,
    dp.cdl_class,
    dp.is_active
  FROM driver_profiles dp
  WHERE dp.user_id = target_user_id;
END;
$$;

-- Create secure RPC function for driver sensitive info (highly sensitive)
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
  emergency_contact_phone TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Strict access control for sensitive data
  IF NOT can_access_driver_sensitive_data(target_user_id) THEN
    RAISE EXCEPTION 'Unauthorized access to sensitive driver data';
  END IF;

  -- Log sensitive access
  PERFORM log_driver_sensitive_access(target_user_id, 'driver_sensitive_info');

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
    dp.emergency_contact_phone
  FROM driver_profiles dp
  WHERE dp.user_id = target_user_id;
END;
$$;

-- Drop existing RLS policy and create more restrictive ones
DROP POLICY IF EXISTS "driver_profiles_final" ON public.driver_profiles;

-- Create separate policies for different access levels
CREATE POLICY "driver_profiles_own_access"
ON public.driver_profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Highly restrictive policy for company admin access
CREATE POLICY "driver_profiles_admin_access"
ON public.driver_profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND can_access_driver_sensitive_data(user_id)
);

-- Prevent unauthorized updates/inserts by company admins
CREATE POLICY "driver_profiles_admin_update_restricted"
ON public.driver_profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr1
    JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
    WHERE ucr1.user_id = driver_profiles.user_id
    AND ucr1.is_active = true
    AND ucr2.user_id = auth.uid()
    AND ucr2.is_active = true
    AND ucr2.role IN ('company_owner', 'superadmin')
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr1
    JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
    WHERE ucr1.user_id = driver_profiles.user_id
    AND ucr1.is_active = true
    AND ucr2.user_id = auth.uid()
    AND ucr2.is_active = true
    AND ucr2.role IN ('company_owner', 'superadmin')
  )
);

-- Create policy for inserts (company admins can create driver profiles)
CREATE POLICY "driver_profiles_admin_insert_restricted"
ON public.driver_profiles
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND (
    user_id = auth.uid() OR 
    EXISTS (
      SELECT 1 FROM user_company_roles ucr1
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ucr1.user_id = driver_profiles.user_id
      AND ucr1.is_active = true
      AND ucr2.user_id = auth.uid()
      AND ucr2.is_active = true
      AND ucr2.role IN ('company_owner', 'superadmin')
    )
  )
);