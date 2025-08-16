-- CRITICAL SECURITY FIXES - PART 3: STRENGTHEN RLS POLICIES

-- ================================
-- 1. FIX LOADS TABLE RLS POLICIES (Drop existing incomplete ones)
-- ================================

-- Drop existing loads policies that might be incomplete
DROP POLICY IF EXISTS "loads_optimized_select" ON loads;
DROP POLICY IF EXISTS "loads_optimized_insert" ON loads;
DROP POLICY IF EXISTS "loads_optimized_update" ON loads;
DROP POLICY IF EXISTS "loads_secure_select" ON loads;
DROP POLICY IF EXISTS "loads_secure_insert" ON loads;
DROP POLICY IF EXISTS "loads_secure_update" ON loads;

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
-- 2. CREATE LOAD DELETION FUNCTION FOR SECURITY
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
-- 3. STRENGTHEN OTHER_INCOME RLS
-- ================================

-- Drop existing policies to replace with more secure ones
DROP POLICY IF EXISTS "other_income_optimized_select" ON other_income;
DROP POLICY IF EXISTS "other_income_optimized_insert" ON other_income;
DROP POLICY IF EXISTS "other_income_optimized_update" ON other_income;
DROP POLICY IF EXISTS "other_income_secure_select" ON other_income;
DROP POLICY IF EXISTS "other_income_secure_insert" ON other_income;
DROP POLICY IF EXISTS "other_income_secure_update" ON other_income;

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