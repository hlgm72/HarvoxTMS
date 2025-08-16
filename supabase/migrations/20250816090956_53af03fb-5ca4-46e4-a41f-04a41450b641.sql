-- CRITICAL SECURITY FIXES - PART 5: FIX LOADS RLS WITH CORRECT COLUMNS

-- ================================
-- 1. FIX LOADS TABLE RLS POLICIES (Using correct column names)
-- ================================

-- Drop existing loads policies that have wrong column references
DROP POLICY IF EXISTS "loads_secure_select" ON loads;
DROP POLICY IF EXISTS "loads_secure_insert" ON loads;
DROP POLICY IF EXISTS "loads_secure_update" ON loads;

-- Create comprehensive loads RLS policies with correct column names
CREATE POLICY "loads_secure_select"
  ON loads FOR SELECT
  USING (
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    (
      -- Drivers can see their assigned loads
      driver_user_id = auth.uid() OR
      -- Company users can see loads through payment period relationship
      payment_period_id IN (
        SELECT dpc.id
        FROM driver_period_calculations dpc
        JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
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
    (
      payment_period_id IN (
        SELECT dpc.id
        FROM driver_period_calculations dpc
        JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
        JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
        WHERE ucr.user_id = auth.uid()
        AND ucr.is_active = true
        AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
      ) OR
      -- Allow drivers to create their own loads if payment_period_id is null initially
      (payment_period_id IS NULL AND created_by = auth.uid())
    )
  );

CREATE POLICY "loads_secure_update"
  ON loads FOR UPDATE
  USING (
    auth.uid() IS NOT NULL AND
    COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
    (
      -- Drivers can update their assigned loads
      driver_user_id = auth.uid() OR
      -- Company admin users can update loads in their company
      payment_period_id IN (
        SELECT dpc.id
        FROM driver_period_calculations dpc
        JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
        JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
        WHERE ucr.user_id = auth.uid()
        AND ucr.is_active = true
        AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
      )
    )
  );

-- ================================
-- 2. FIX LOAD_STOPS RLS POLICIES (Using correct column relationships)
-- ================================

-- Drop existing policies to replace with more secure ones
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
      LEFT JOIN driver_period_calculations dpc ON l.payment_period_id = dpc.id
      LEFT JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      LEFT JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE (
        -- Driver can see their own loads
        l.driver_user_id = auth.uid() OR
        -- Company users can see loads in their company
        (ucr.user_id = auth.uid() AND ucr.is_active = true)
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
      LEFT JOIN driver_period_calculations dpc ON l.payment_period_id = dpc.id
      LEFT JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      LEFT JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE (
        ucr.user_id = auth.uid() 
        AND ucr.is_active = true
        AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
      )
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
      LEFT JOIN driver_period_calculations dpc ON l.payment_period_id = dpc.id
      LEFT JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      LEFT JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE (
        -- Drivers can update their own load stops
        l.driver_user_id = auth.uid() OR
        -- Company admins can update load stops
        (ucr.user_id = auth.uid() 
         AND ucr.is_active = true
         AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin'))
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
      LEFT JOIN driver_period_calculations dpc ON l.payment_period_id = dpc.id
      LEFT JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      LEFT JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE (
        ucr.user_id = auth.uid() 
        AND ucr.is_active = true
        AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
      )
    )
  );

-- ================================
-- 3. UPDATE DELETE LOAD FUNCTION WITH CORRECT COLUMNS
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

  -- Get load details and check permissions using correct column relationships
  SELECT l.* INTO load_record
  FROM loads l
  WHERE l.id = load_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Carga no encontrada';
  END IF;

  -- Get company ID through payment period relationship if it exists
  SELECT cpp.company_id INTO company_id_val
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE dpc.id = load_record.payment_period_id;

  -- Check if user has permission to delete this load
  IF company_id_val IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = current_user_id
      AND company_id = company_id_val
      AND role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin')
      AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Sin permisos para eliminar esta carga';
    END IF;
  ELSE
    -- If no company relationship, only allow creator to delete
    IF load_record.created_by != current_user_id THEN
      RAISE EXCEPTION 'Sin permisos para eliminar esta carga';
    END IF;
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