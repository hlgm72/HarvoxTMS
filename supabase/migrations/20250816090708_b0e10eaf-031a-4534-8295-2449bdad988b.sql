-- CRITICAL SECURITY FIXES - PART 2: FIX FUNCTION DEPENDENCIES AND RLS

-- ================================
-- 1. DROP FUNCTIONS WITH CASCADE TO REMOVE DEPENDENCIES
-- ================================

DROP FUNCTION IF EXISTS public.is_user_superadmin_safe(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_user_admin_in_company_safe(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_company_ids_safe(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_authenticated_superadmin() CASCADE;

-- ================================
-- 2. RECREATE SECURITY FUNCTIONS WITH PROPER SEARCH PATHS
-- ================================

CREATE OR REPLACE FUNCTION public.is_user_superadmin_safe(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = user_id_param
    AND role = 'superadmin'
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.is_user_admin_in_company_safe(user_id_param uuid, company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = user_id_param
    AND company_id = company_id_param
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.get_user_company_ids_safe(user_id_param uuid DEFAULT auth.uid())
RETURNS uuid[]
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT ARRAY_AGG(company_id)
  FROM user_company_roles
  WHERE user_id = user_id_param
    AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated_superadmin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  );
$$;

-- ================================
-- 3. RECREATE CRITICAL RLS POLICIES THAT WERE DROPPED
-- ================================

-- Archive logs superadmin policy
CREATE POLICY "archive_logs_superadmin_policy"
  ON archive_logs FOR ALL
  USING (
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    is_user_superadmin_safe(auth.uid())
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    is_user_superadmin_safe(auth.uid())
  );

-- Expense types policies
CREATE POLICY "expense_types_insert"
  ON expense_types FOR INSERT
  WITH CHECK (is_user_superadmin_safe(auth.uid()));

CREATE POLICY "expense_types_update"
  ON expense_types FOR UPDATE
  USING (is_user_superadmin_safe(auth.uid()));

CREATE POLICY "expense_types_delete"
  ON expense_types FOR DELETE
  USING (is_user_superadmin_safe(auth.uid()));

-- Companies unified policies
CREATE POLICY "Companies unified select policy"
  ON companies FOR SELECT
  USING (
    current_setting('app.service_operation', true) = 'allowed' OR
    (
      auth.uid() IS NOT NULL AND
      COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
      (
        id IN (
          SELECT ucr.company_id
          FROM user_company_roles ucr
          WHERE ucr.user_id = auth.uid()
          AND ucr.is_active = true
        ) OR
        is_user_superadmin_safe(auth.uid())
      )
    )
  );

CREATE POLICY "Companies unified insert policy"
  ON companies FOR INSERT
  WITH CHECK (
    current_setting('app.service_operation', true) = 'allowed' OR
    (
      auth.uid() IS NOT NULL AND
      COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
      is_user_superadmin_safe(auth.uid())
    )
  );

CREATE POLICY "Companies unified delete policy"
  ON companies FOR DELETE
  USING (
    current_setting('app.service_operation', true) = 'allowed' OR
    (
      auth.uid() IS NOT NULL AND
      COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
      is_user_superadmin_safe(auth.uid())
    )
  );

-- ================================
-- 4. CREATE MISSING PROFILES TABLE WITH PROPER RLS
-- ================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  display_name text,
  is_active boolean DEFAULT true,
  preferences jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  PRIMARY KEY (id)
);

-- Enable RLS on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles RLS policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Company admins can view profiles of their company users"
  ON public.profiles FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    (
      auth.uid() = id OR
      id IN (
        SELECT ucr1.user_id
        FROM user_company_roles ucr1
        WHERE ucr1.company_id IN (
          SELECT ucr2.company_id
          FROM user_company_roles ucr2
          WHERE ucr2.user_id = auth.uid()
          AND ucr2.is_active = true
          AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
        )
        AND ucr1.is_active = true
      )
    )
  );

-- ================================
-- 5. CREATE SECURITY AUDIT LOG
-- ================================

CREATE TABLE IF NOT EXISTS public.security_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  action text NOT NULL,
  table_name text,
  record_id uuid,
  old_values jsonb,
  new_values jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on security audit log
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only superadmins can access security audit logs
CREATE POLICY "security_audit_log_superadmin_only"
  ON public.security_audit_log FOR ALL
  USING (is_authenticated_superadmin())
  WITH CHECK (is_authenticated_superadmin());

-- ================================
-- 6. TRIGGER FOR AUTOMATED PROFILE CREATION
-- ================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );
  RETURN NEW;
END;
$$;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();