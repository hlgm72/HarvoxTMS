-- ===============================================
-- DROP AND RECREATE EQUIPMENT FUNCTIONS
-- ===============================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS public.unassign_equipment_with_validation(UUID, TEXT);

-- ===============================================
-- ACID FUNCTIONS FOR EQUIPMENT MANAGEMENT
-- ===============================================

-- Function: Create or Update Equipment with ACID validation
CREATE OR REPLACE FUNCTION public.create_or_update_equipment_with_validation(
  equipment_data JSONB,
  equipment_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  result_equipment RECORD;
  operation_type TEXT;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Extract company_id from equipment_data
  target_company_id := (equipment_data->>'company_id')::UUID;
  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'company_id es requerido';
  END IF;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para gestionar equipos en esta empresa';
  END IF;

  -- Determine operation type
  operation_type := CASE WHEN equipment_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Validate required fields
  IF NULLIF(equipment_data->>'equipment_number', '') IS NULL THEN
    RAISE EXCEPTION 'equipment_number es requerido';
  END IF;

  IF NULLIF(equipment_data->>'equipment_type', '') IS NULL THEN
    RAISE EXCEPTION 'equipment_type es requerido';
  END IF;

  -- For UPDATE operations, validate equipment exists and user has access
  IF operation_type = 'UPDATE' THEN
    IF NOT EXISTS (
      SELECT 1 FROM company_equipment ce
      JOIN user_company_roles ucr ON ce.company_id = ucr.company_id
      WHERE ce.id = equipment_id
      AND ucr.user_id = current_user_id
      AND ucr.is_active = true
    ) THEN
      RAISE EXCEPTION 'Equipo no encontrado o sin permisos para modificarlo';
    END IF;
  END IF;

  -- Check for duplicate equipment numbers within company (exclude current equipment if updating)
  IF EXISTS (
    SELECT 1 FROM company_equipment
    WHERE company_id = target_company_id
    AND equipment_number = equipment_data->>'equipment_number'
    AND (equipment_id IS NULL OR id != equipment_id)
  ) THEN
    RAISE EXCEPTION 'Ya existe un equipo con el número %', equipment_data->>'equipment_number';
  END IF;

  -- ================================
  -- 3. CREATE OR UPDATE EQUIPMENT
  -- ================================
  
  IF operation_type = 'CREATE' THEN
    INSERT INTO company_equipment (
      company_id,
      equipment_number,
      equipment_type,
      make,
      model,
      year,
      vin_number,
      license_plate,
      fuel_type,
      status,
      purchase_date,
      purchase_price,
      current_mileage,
      insurance_expiry_date,
      registration_expiry_date,
      license_plate_expiry_date,
      annual_inspection_expiry_date,
      notes,
      created_by,
      updated_by
    ) VALUES (
      target_company_id,
      equipment_data->>'equipment_number',
      equipment_data->>'equipment_type',
      NULLIF(equipment_data->>'make', ''),
      NULLIF(equipment_data->>'model', ''),
      NULLIF((equipment_data->>'year'), '')::INTEGER,
      NULLIF(equipment_data->>'vin_number', ''),
      NULLIF(equipment_data->>'license_plate', ''),
      COALESCE(equipment_data->>'fuel_type', 'diesel'),
      COALESCE(equipment_data->>'status', 'active'),
      NULLIF((equipment_data->>'purchase_date'), '')::DATE,
      NULLIF((equipment_data->>'purchase_price'), '')::NUMERIC,
      NULLIF((equipment_data->>'current_mileage'), '')::INTEGER,
      NULLIF((equipment_data->>'insurance_expiry_date'), '')::DATE,
      NULLIF((equipment_data->>'registration_expiry_date'), '')::DATE,
      NULLIF((equipment_data->>'license_plate_expiry_date'), '')::DATE,
      NULLIF((equipment_data->>'annual_inspection_expiry_date'), '')::DATE,
      NULLIF(equipment_data->>'notes', ''),
      current_user_id,
      current_user_id
    ) RETURNING * INTO result_equipment;
  ELSE
    UPDATE company_equipment SET
      equipment_number = equipment_data->>'equipment_number',
      equipment_type = equipment_data->>'equipment_type',
      make = NULLIF(equipment_data->>'make', ''),
      model = NULLIF(equipment_data->>'model', ''),
      year = NULLIF((equipment_data->>'year'), '')::INTEGER,
      vin_number = NULLIF(equipment_data->>'vin_number', ''),
      license_plate = NULLIF(equipment_data->>'license_plate', ''),
      fuel_type = COALESCE(equipment_data->>'fuel_type', fuel_type),
      status = COALESCE(equipment_data->>'status', status),
      purchase_date = NULLIF((equipment_data->>'purchase_date'), '')::DATE,
      purchase_price = NULLIF((equipment_data->>'purchase_price'), '')::NUMERIC,
      current_mileage = NULLIF((equipment_data->>'current_mileage'), '')::INTEGER,
      insurance_expiry_date = NULLIF((equipment_data->>'insurance_expiry_date'), '')::DATE,
      registration_expiry_date = NULLIF((equipment_data->>'registration_expiry_date'), '')::DATE,
      license_plate_expiry_date = NULLIF((equipment_data->>'license_plate_expiry_date'), '')::DATE,
      annual_inspection_expiry_date = NULLIF((equipment_data->>'annual_inspection_expiry_date'), '')::DATE,
      notes = NULLIF(equipment_data->>'notes', ''),
      updated_by = current_user_id,
      updated_at = now()
    WHERE id = equipment_id
    RETURNING * INTO result_equipment;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', CASE 
      WHEN operation_type = 'CREATE' THEN 'Equipo creado exitosamente'
      ELSE 'Equipo actualizado exitosamente'
    END,
    'equipment', row_to_json(result_equipment),
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación ACID de equipo: %', SQLERRM;
END;
$$;

-- ===============================================
-- Function: Assign Equipment to Driver with ACID validation
CREATE OR REPLACE FUNCTION public.assign_equipment_with_validation(
  assignment_data JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  target_equipment_id UUID;
  target_driver_id UUID;
  company_id_check UUID;
  result_assignment RECORD;
  previous_assignment RECORD;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Extract required data
  target_equipment_id := (assignment_data->>'equipment_id')::UUID;
  target_driver_id := (assignment_data->>'driver_user_id')::UUID;

  IF target_equipment_id IS NULL THEN
    RAISE EXCEPTION 'equipment_id es requerido';
  END IF;

  IF target_driver_id IS NULL THEN
    RAISE EXCEPTION 'driver_user_id es requerido';
  END IF;

  -- ================================
  -- 1. VALIDATE PERMISSIONS & BUSINESS RULES
  -- ================================
  
  -- Get equipment company and validate permissions
  SELECT ce.company_id INTO company_id_check
  FROM company_equipment ce
  JOIN user_company_roles ucr ON ce.company_id = ucr.company_id
  WHERE ce.id = target_equipment_id
  AND ucr.user_id = current_user_id
  AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  AND ucr.is_active = true;

  IF company_id_check IS NULL THEN
    RAISE EXCEPTION 'Sin permisos para asignar este equipo o equipo no encontrado';
  END IF;

  -- Validate driver belongs to same company
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = target_driver_id
    AND company_id = company_id_check
    AND role = 'driver'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Conductor no encontrado o no pertenece a esta empresa';
  END IF;

  -- Validate equipment is available (not currently assigned to another active driver)
  SELECT * INTO previous_assignment
  FROM equipment_assignments
  WHERE equipment_id = target_equipment_id
  AND is_active = true
  AND driver_user_id != target_driver_id;

  IF FOUND THEN
    RAISE EXCEPTION 'El equipo ya está asignado a otro conductor activo';
  END IF;

  -- ================================
  -- 2. DEACTIVATE PREVIOUS ASSIGNMENT (if same driver)
  -- ================================
  
  UPDATE equipment_assignments
  SET 
    is_active = false,
    unassigned_date = CURRENT_DATE,
    updated_at = now()
  WHERE equipment_id = target_equipment_id
  AND driver_user_id = target_driver_id
  AND is_active = true;

  -- ================================
  -- 3. CREATE NEW ASSIGNMENT
  -- ================================
  
  INSERT INTO equipment_assignments (
    equipment_id,
    driver_user_id,
    assignment_type,
    assigned_date,
    assigned_by,
    notes,
    is_active
  ) VALUES (
    target_equipment_id,
    target_driver_id,
    COALESCE(assignment_data->>'assignment_type', 'temporary'),
    COALESCE((assignment_data->>'assigned_date')::DATE, CURRENT_DATE),
    current_user_id,
    NULLIF(assignment_data->>'notes', ''),
    true
  ) RETURNING * INTO result_assignment;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Equipo asignado exitosamente',
    'assignment', row_to_json(result_assignment),
    'assigned_by', current_user_id,
    'assigned_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en asignación ACID de equipo: %', SQLERRM;
END;
$$;

-- ===============================================
-- Function: Unassign Equipment with ACID validation
CREATE OR REPLACE FUNCTION public.unassign_equipment_with_validation(
  assignment_id UUID,
  unassignment_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  assignment_record RECORD;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  
  SELECT ea.*, ce.company_id INTO assignment_record
  FROM equipment_assignments ea
  JOIN company_equipment ce ON ea.equipment_id = ce.id
  JOIN user_company_roles ucr ON ce.company_id = ucr.company_id
  WHERE ea.id = assignment_id
  AND ucr.user_id = current_user_id
  AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  AND ucr.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asignación no encontrada o sin permisos para modificarla';
  END IF;

  IF NOT assignment_record.is_active THEN
    RAISE EXCEPTION 'La asignación ya está inactiva';
  END IF;

  -- ================================
  -- 2. UNASSIGN EQUIPMENT
  -- ================================
  
  UPDATE equipment_assignments
  SET 
    is_active = false,
    unassigned_date = CURRENT_DATE,
    notes = CASE 
      WHEN unassignment_reason IS NOT NULL 
      THEN CONCAT(COALESCE(notes, ''), ' | Desasignado: ', unassignment_reason)
      ELSE notes
    END,
    updated_at = now()
  WHERE id = assignment_id;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Equipo desasignado exitosamente',
    'assignment_id', assignment_id,
    'unassigned_by', current_user_id,
    'unassigned_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en desasignación ACID de equipo: %', SQLERRM;
END;
$$;