-- CRITICAL SECURITY FIXES - PART 4: FIX LOAD STOPS RLS

-- ================================
-- 1. STRENGTHEN LOAD_STOPS RLS (Using correct column names)
-- ================================

-- Drop existing policies to replace with more secure ones
DROP POLICY IF EXISTS "load_stops_optimized_select" ON load_stops;
DROP POLICY IF EXISTS "load_stops_optimized_insert" ON load_stops;
DROP POLICY IF EXISTS "load_stops_optimized_update" ON load_stops;
DROP POLICY IF EXISTS "load_stops_optimized_delete" ON load_stops;
DROP POLICY IF EXISTS "load_stops_secure_select" ON load_stops;
DROP POLICY IF EXISTS "load_stops_secure_insert" ON load_stops;
DROP POLICY IF EXISTS "load_stops_secure_update" ON load_stops;
DROP POLICY IF EXISTS "load_stops_secure_delete" ON load_stops;

CREATE POLICY "load_stops_secure_select"
  ON load_stops FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    load_id IN (
      SELECT l.id
      FROM loads l
      JOIN company_payment_periods cpp ON l.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
    )
  );

CREATE POLICY "load_stops_secure_insert"
  ON load_stops FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    load_id IN (
      SELECT l.id
      FROM loads l
      JOIN company_payment_periods cpp ON l.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
    )
  );

CREATE POLICY "load_stops_secure_update"
  ON load_stops FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    load_id IN (
      SELECT l.id
      FROM loads l
      JOIN company_payment_periods cpp ON l.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
    )
  );

CREATE POLICY "load_stops_secure_delete"
  ON load_stops FOR DELETE
  USING (
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    load_id IN (
      SELECT l.id
      FROM loads l
      JOIN company_payment_periods cpp ON l.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
    )
  );

-- ================================
-- 2. ADD SECURITY VALIDATION TRIGGERS
-- ================================

CREATE OR REPLACE FUNCTION public.validate_user_company_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Log security access attempts
  INSERT INTO security_audit_log (
    user_id,
    action,
    table_name,
    record_id,
    new_values,
    created_at
  ) VALUES (
    auth.uid(),
    TG_OP,
    TG_TABLE_NAME,
    COALESCE(NEW.id, OLD.id),
    CASE WHEN NEW IS NOT NULL THEN row_to_json(NEW) ELSE NULL END,
    now()
  );
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Add security audit triggers to critical tables
DROP TRIGGER IF EXISTS security_audit_loads ON loads;
CREATE TRIGGER security_audit_loads
  AFTER INSERT OR UPDATE OR DELETE ON loads
  FOR EACH ROW EXECUTE FUNCTION validate_user_company_access();

DROP TRIGGER IF EXISTS security_audit_companies ON companies;
CREATE TRIGGER security_audit_companies
  AFTER INSERT OR UPDATE OR DELETE ON companies
  FOR EACH ROW EXECUTE FUNCTION validate_user_company_access();

-- ================================
-- 3. CREATE COMPREHENSIVE INPUT VALIDATION FUNCTION
-- ================================

CREATE OR REPLACE FUNCTION public.validate_and_sanitize_input(
  input_text text,
  max_length integer DEFAULT 1000,
  allow_html boolean DEFAULT false
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  sanitized_text text;
BEGIN
  -- Return null for null input
  IF input_text IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Trim whitespace
  sanitized_text := trim(input_text);
  
  -- Check length
  IF length(sanitized_text) > max_length THEN
    RAISE EXCEPTION 'Input exceeds maximum length of %', max_length;
  END IF;
  
  -- Basic XSS protection if HTML not allowed
  IF NOT allow_html THEN
    sanitized_text := regexp_replace(sanitized_text, '<[^>]*>', '', 'g');
    sanitized_text := regexp_replace(sanitized_text, '[<>"\''&]', '', 'g');
  END IF;
  
  -- Block common SQL injection patterns
  IF sanitized_text ~* '(union|select|insert|update|delete|drop|exec|script)' THEN
    RAISE EXCEPTION 'Input contains potentially harmful content';
  END IF;
  
  RETURN sanitized_text;
END;
$$;

-- ================================
-- 4. CREATE RATE LIMITING FUNCTION
-- ================================

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action_type text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.check_rate_limit(
  action_type_param text,
  max_requests integer DEFAULT 100,
  window_minutes integer DEFAULT 60
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  current_count integer;
  window_start_time timestamp with time zone;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  window_start_time := now() - (window_minutes || ' minutes')::interval;
  
  -- Clean up old rate limit records
  DELETE FROM rate_limits 
  WHERE window_start < window_start_time;
  
  -- Get current count for this user and action
  SELECT COALESCE(SUM(request_count), 0) INTO current_count
  FROM rate_limits
  WHERE user_id = current_user_id
  AND action_type = action_type_param
  AND window_start >= window_start_time;
  
  -- Check if limit exceeded
  IF current_count >= max_requests THEN
    RETURN false;
  END IF;
  
  -- Record this request
  INSERT INTO rate_limits (user_id, action_type)
  VALUES (current_user_id, action_type_param);
  
  RETURN true;
END;
$$;