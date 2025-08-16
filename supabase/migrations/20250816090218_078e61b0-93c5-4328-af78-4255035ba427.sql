-- CRITICAL SECURITY FIXES

-- ================================
-- 1. FIX FUNCTION SEARCH PATH SECURITY
-- ================================

-- Fix search paths for all security-critical functions
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
-- 2. CREATE MISSING PROFILES TABLE WITH PROPER RLS
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
-- 3. FIX LOADS TABLE RLS POLICIES
-- ================================

-- Drop existing loads policies that might be incomplete
DROP POLICY IF EXISTS "loads_optimized_select" ON loads;
DROP POLICY IF EXISTS "loads_optimized_insert" ON loads;
DROP POLICY IF EXISTS "loads_optimized_update" ON loads;

-- Create comprehensive loads RLS policies
CREATE POLICY "loads_secure_select"
  ON loads FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    (
      -- Drivers can see their assigned loads
      assigned_driver_id = auth.uid() OR
      -- Company users can see loads in their companies
      company_payment_period_id IN (
        SELECT cpp.id
        FROM company_payment_periods cpp
        JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
        WHERE ucr.user_id = auth.uid()
        AND ucr.is_active = true
      )
    )
  );

CREATE POLICY "loads_secure_insert"
  ON loads FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    company_payment_period_id IN (
      SELECT cpp.id
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
    )
  );

CREATE POLICY "loads_secure_update"
  ON loads FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    (
      -- Drivers can update their assigned loads
      assigned_driver_id = auth.uid() OR
      -- Company admin users can update loads in their companies
      company_payment_period_id IN (
        SELECT cpp.id
        FROM company_payment_periods cpp
        JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
        WHERE ucr.user_id = auth.uid()
        AND ucr.is_active = true
        AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
      )
    )
  );

-- ================================
-- 4. CREATE LOAD DELETION FUNCTION FOR SECURITY
-- ================================

CREATE OR REPLACE FUNCTION public.delete_load_with_validation(load_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id uuid;
  load_record RECORD;
  company_id_val uuid;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get load details and check permissions
  SELECT l.*, cpp.company_id INTO load_record, company_id_val
  FROM loads l
  JOIN company_payment_periods cpp ON l.company_payment_period_id = cpp.id
  WHERE l.id = load_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carga no encontrada';
  END IF;

  -- Check if user has permission to delete this load
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = company_id_val
    AND role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para eliminar esta carga';
  END IF;

  -- Delete related records in transaction
  DELETE FROM load_stops WHERE load_id = load_id_param;
  DELETE FROM load_documents WHERE load_id = load_id_param;
  DELETE FROM loads WHERE id = load_id_param;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Carga eliminada exitosamente',
    'deleted_load_id', load_id_param,
    'deleted_by', current_user_id,
    'deleted_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en eliminación ACID de carga: %', SQLERRM;
END;
$$;

-- ================================
-- 5. STRENGTHEN OTHER_INCOME RLS
-- ================================

-- Drop existing policies to replace with more secure ones
DROP POLICY IF EXISTS "other_income_optimized_select" ON other_income;
DROP POLICY IF EXISTS "other_income_optimized_insert" ON other_income;
DROP POLICY IF EXISTS "other_income_optimized_update" ON other_income;

CREATE POLICY "other_income_secure_select"
  ON other_income FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    payment_period_id IN (
      SELECT dpc.id
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND (
        dpc.driver_user_id = auth.uid() OR
        ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      )
    )
  );

CREATE POLICY "other_income_secure_insert"
  ON other_income FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    payment_period_id IN (
      SELECT dpc.id
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  );

CREATE POLICY "other_income_secure_update"
  ON other_income FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    payment_period_id IN (
      SELECT dpc.id
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )
  );

-- ================================
-- 6. STRENGTHEN LOAD_STOPS RLS
-- ================================

-- Drop existing policies to replace with more secure ones
DROP POLICY IF EXISTS "load_stops_optimized_select" ON load_stops;
DROP POLICY IF EXISTS "load_stops_optimized_insert" ON load_stops;
DROP POLICY IF EXISTS "load_stops_optimized_update" ON load_stops;
DROP POLICY IF EXISTS "load_stops_optimized_delete" ON load_stops;

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
      AND (
        l.assigned_driver_id = auth.uid() OR
        ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
      )
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
      AND (
        l.assigned_driver_id = auth.uid() OR
        ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
      )
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
-- 7. CREATE SECURITY AUDIT LOG
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
-- 8. TRIGGER FOR AUTOMATED PROFILE CREATION
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