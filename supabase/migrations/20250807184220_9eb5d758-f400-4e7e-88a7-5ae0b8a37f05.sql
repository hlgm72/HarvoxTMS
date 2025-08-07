-- ========================================
-- ACID Implementation for User Management and Roles
-- ========================================

-- Function to create user with company role assignment (ACID)
CREATE OR REPLACE FUNCTION public.create_user_with_company_role_validation(
  user_data JSONB,
  company_role_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_user RECORD;
  result_role RECORD;
  current_user_id UUID;
  target_company_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  target_company_id := (company_role_data->>'company_id')::UUID;

  -- Start atomic transaction
  
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
    RAISE EXCEPTION 'No tienes permisos para crear usuarios en esta empresa';
  END IF;

  -- Validate that the target user exists in auth.users
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = (user_data->>'user_id')::UUID
  ) THEN
    RAISE EXCEPTION 'El usuario especificado no existe en el sistema de autenticación';
  END IF;

  -- Check if user already has a role in this company
  IF EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (user_data->>'user_id')::UUID
    AND company_id = target_company_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'El usuario ya tiene un rol activo en esta empresa';
  END IF;

  -- ================================
  -- 2. CREATE/UPDATE USER PROFILE
  -- ================================
  INSERT INTO driver_profiles (
    user_id,
    driver_id,
    license_number,
    license_state,
    license_issue_date,
    license_expiry_date,
    cdl_class,
    cdl_endorsements,
    date_of_birth,
    emergency_contact_name,
    emergency_contact_phone,
    is_active
  ) VALUES (
    (user_data->>'user_id')::UUID,
    NULLIF(user_data->>'driver_id', ''),
    NULLIF(user_data->>'license_number', ''),
    NULLIF(user_data->>'license_state', ''),
    NULLIF((user_data->>'license_issue_date'), '')::DATE,
    NULLIF((user_data->>'license_expiry_date'), '')::DATE,
    NULLIF(user_data->>'cdl_class', ''),
    NULLIF(user_data->>'cdl_endorsements', ''),
    NULLIF((user_data->>'date_of_birth'), '')::DATE,
    NULLIF(user_data->>'emergency_contact_name', ''),
    NULLIF(user_data->>'emergency_contact_phone', ''),
    COALESCE((user_data->>'is_active')::BOOLEAN, true)
  )
  ON CONFLICT (user_id) DO UPDATE SET
    driver_id = COALESCE(EXCLUDED.driver_id, driver_profiles.driver_id),
    license_number = COALESCE(EXCLUDED.license_number, driver_profiles.license_number),
    license_state = COALESCE(EXCLUDED.license_state, driver_profiles.license_state),
    license_issue_date = COALESCE(EXCLUDED.license_issue_date, driver_profiles.license_issue_date),
    license_expiry_date = COALESCE(EXCLUDED.license_expiry_date, driver_profiles.license_expiry_date),
    cdl_class = COALESCE(EXCLUDED.cdl_class, driver_profiles.cdl_class),
    cdl_endorsements = COALESCE(EXCLUDED.cdl_endorsements, driver_profiles.cdl_endorsements),
    date_of_birth = COALESCE(EXCLUDED.date_of_birth, driver_profiles.date_of_birth),
    emergency_contact_name = COALESCE(EXCLUDED.emergency_contact_name, driver_profiles.emergency_contact_name),
    emergency_contact_phone = COALESCE(EXCLUDED.emergency_contact_phone, driver_profiles.emergency_contact_phone),
    is_active = COALESCE(EXCLUDED.is_active, driver_profiles.is_active),
    updated_at = now()
  RETURNING * INTO result_user;

  -- ================================
  -- 3. ASSIGN COMPANY ROLE
  -- ================================
  INSERT INTO user_company_roles (
    user_id,
    company_id,
    role,
    is_active,
    assigned_by,
    assigned_at
  ) VALUES (
    (user_data->>'user_id')::UUID,
    target_company_id,
    (company_role_data->>'role')::user_role,
    true,
    current_user_id,
    now()
  ) RETURNING * INTO result_role;

  -- ================================
  -- 4. CREATE OWNER OPERATOR RECORD (if driver role)
  -- ================================
  IF (company_role_data->>'role') = 'driver' THEN
    INSERT INTO owner_operators (
      user_id,
      company_id,
      operator_type,
      contract_start_date,
      is_active
    ) VALUES (
      (user_data->>'user_id')::UUID,
      target_company_id,
      COALESCE(user_data->>'operator_type', 'company_driver'),
      COALESCE((user_data->>'contract_start_date')::DATE, CURRENT_DATE),
      true
    )
    ON CONFLICT (user_id, company_id) DO UPDATE SET
      operator_type = COALESCE(EXCLUDED.operator_type, owner_operators.operator_type),
      contract_start_date = COALESCE(EXCLUDED.contract_start_date, owner_operators.contract_start_date),
      is_active = EXCLUDED.is_active,
      updated_at = now();
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Usuario creado/actualizado exitosamente con rol de empresa asignado',
    'user_profile', row_to_json(result_user),
    'company_role', row_to_json(result_role),
    'owner_operator_created', (company_role_data->>'role') = 'driver',
    'assigned_by', current_user_id,
    'assigned_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  RAISE EXCEPTION 'Error en creación ACID de usuario: %', SQLERRM;
END;
$$;

-- Function to update user company role with ACID guarantees
CREATE OR REPLACE FUNCTION public.update_user_company_role_with_validation(
  target_user_id UUID,
  target_company_id UUID,
  new_role_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_role_record RECORD;
  result_role RECORD;
  current_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Start atomic transaction
  
  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'No tienes permisos para modificar roles en esta empresa';
  END IF;

  -- Get current role information
  SELECT * INTO old_role_record
  FROM user_company_roles
  WHERE user_id = target_user_id
  AND company_id = target_company_id
  AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Usuario no encontrado en la empresa especificada';
  END IF;

  -- Prevent self-demotion from company_owner
  IF current_user_id = target_user_id 
     AND old_role_record.role = 'company_owner' 
     AND (new_role_data->>'role') != 'company_owner' THEN
    RAISE EXCEPTION 'No puedes cambiar tu propio rol de propietario de empresa';
  END IF;

  -- ================================
  -- 2. UPDATE COMPANY ROLE
  -- ================================
  UPDATE user_company_roles SET
    role = (new_role_data->>'role')::user_role,
    is_active = COALESCE((new_role_data->>'is_active')::BOOLEAN, is_active),
    updated_at = now()
  WHERE user_id = target_user_id
  AND company_id = target_company_id
  RETURNING * INTO result_role;

  -- ================================
  -- 3. HANDLE ROLE-SPECIFIC UPDATES
  -- ================================
  -- If changing from/to driver role, handle owner_operators
  IF old_role_record.role = 'driver' AND (new_role_data->>'role') != 'driver' THEN
    -- Deactivate owner operator record
    UPDATE owner_operators 
    SET is_active = false, updated_at = now()
    WHERE user_id = target_user_id AND company_id = target_company_id;
  ELSIF old_role_record.role != 'driver' AND (new_role_data->>'role') = 'driver' THEN
    -- Create or reactivate owner operator record
    INSERT INTO owner_operators (
      user_id,
      company_id,
      operator_type,
      contract_start_date,
      is_active
    ) VALUES (
      target_user_id,
      target_company_id,
      'company_driver',
      CURRENT_DATE,
      true
    )
    ON CONFLICT (user_id, company_id) DO UPDATE SET
      is_active = true,
      updated_at = now();
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Rol de usuario actualizado exitosamente con garantías ACID',
    'old_role', old_role_record.role,
    'new_role', result_role.role,
    'user_id', target_user_id,
    'company_id', target_company_id,
    'updated_by', current_user_id,
    'updated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  RAISE EXCEPTION 'Error actualizando rol ACID: %', SQLERRM;
END;
$$;

-- ========================================
-- ACID Implementation for Equipment Assignment
-- ========================================

-- Function to assign equipment to driver with ACID guarantees
CREATE OR REPLACE FUNCTION public.assign_equipment_to_driver_with_validation(
  assignment_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_assignment RECORD;
  equipment_record RECORD;
  driver_record RECORD;
  current_user_id UUID;
  target_equipment_id UUID;
  target_driver_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  target_equipment_id := (assignment_data->>'equipment_id')::UUID;
  target_driver_id := (assignment_data->>'driver_user_id')::UUID;

  -- Start atomic transaction
  
  -- ================================
  -- 1. VALIDATE EQUIPMENT AND DRIVER
  -- ================================
  -- Verify equipment exists and get company info
  SELECT ce.*, ucr.company_id INTO equipment_record
  FROM company_equipment ce
  JOIN user_company_roles ucr ON ce.company_id = ucr.company_id
  WHERE ce.id = target_equipment_id
  AND ucr.user_id = current_user_id
  AND ucr.is_active = true
  AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Equipo no encontrado o sin permisos para asignar';
  END IF;

  IF equipment_record.status != 'active' THEN
    RAISE EXCEPTION 'El equipo no está en estado activo para asignación';
  END IF;

  -- Verify driver exists in the same company
  SELECT dp.* INTO driver_record
  FROM driver_profiles dp
  JOIN user_company_roles ucr ON dp.user_id = ucr.user_id
  WHERE dp.user_id = target_driver_id
  AND ucr.company_id = equipment_record.company_id
  AND ucr.role = 'driver'
  AND ucr.is_active = true
  AND dp.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Conductor no encontrado o no activo en la empresa';
  END IF;

  -- ================================
  -- 2. DEACTIVATE EXISTING ASSIGNMENTS
  -- ================================
  -- Deactivate any current assignments for this equipment
  UPDATE equipment_assignments 
  SET 
    is_active = false,
    unassigned_date = CURRENT_DATE,
    updated_at = now()
  WHERE equipment_id = target_equipment_id
  AND is_active = true;

  -- Deactivate any current assignments for this driver (if assignment_type is 'permanent')
  IF (assignment_data->>'assignment_type') = 'permanent' THEN
    UPDATE equipment_assignments 
    SET 
      is_active = false,
      unassigned_date = CURRENT_DATE,
      updated_at = now()
    WHERE driver_user_id = target_driver_id
    AND assignment_type = 'permanent'
    AND is_active = true;
  END IF;

  -- ================================
  -- 3. CREATE NEW ASSIGNMENT
  -- ================================
  INSERT INTO equipment_assignments (
    equipment_id,
    driver_user_id,
    assignment_type,
    assigned_date,
    notes,
    assigned_by,
    is_active
  ) VALUES (
    target_equipment_id,
    target_driver_id,
    COALESCE(assignment_data->>'assignment_type', 'temporary'),
    COALESCE((assignment_data->>'assigned_date')::DATE, CURRENT_DATE),
    NULLIF(assignment_data->>'notes', ''),
    current_user_id,
    true
  ) RETURNING * INTO result_assignment;

  -- ================================
  -- 4. UPDATE EQUIPMENT STATUS
  -- ================================
  UPDATE company_equipment 
  SET 
    status = 'in_use',
    updated_at = now(),
    updated_by = current_user_id
  WHERE id = target_equipment_id;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Equipo asignado exitosamente con garantías ACID',
    'assignment', row_to_json(result_assignment),
    'equipment_number', equipment_record.equipment_number,
    'driver_id', target_driver_id,
    'assignment_type', result_assignment.assignment_type,
    'assigned_by', current_user_id,
    'assigned_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  RAISE EXCEPTION 'Error en asignación ACID de equipo: %', SQLERRM;
END;
$$;

-- Function to unassign equipment with ACID guarantees
CREATE OR REPLACE FUNCTION public.unassign_equipment_with_validation(
  assignment_id UUID,
  unassignment_notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  assignment_record RECORD;
  current_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Start atomic transaction
  
  -- ================================
  -- 1. VALIDATE ASSIGNMENT AND PERMISSIONS
  -- ================================
  SELECT ea.*, ce.company_id, ce.equipment_number
  INTO assignment_record
  FROM equipment_assignments ea
  JOIN company_equipment ce ON ea.equipment_id = ce.id
  JOIN user_company_roles ucr ON ce.company_id = ucr.company_id
  WHERE ea.id = assignment_id
  AND ucr.user_id = current_user_id
  AND ucr.is_active = true
  AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin');

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Asignación no encontrada o sin permisos para desasignar';
  END IF;

  IF NOT assignment_record.is_active THEN
    RAISE EXCEPTION 'La asignación ya está inactiva';
  END IF;

  -- ================================
  -- 2. DEACTIVATE ASSIGNMENT
  -- ================================
  UPDATE equipment_assignments 
  SET 
    is_active = false,
    unassigned_date = CURRENT_DATE,
    notes = CASE 
      WHEN unassignment_notes IS NOT NULL THEN 
        COALESCE(notes, '') || ' | Desasignado: ' || unassignment_notes
      ELSE notes
    END,
    updated_at = now()
  WHERE id = assignment_id;

  -- ================================
  -- 3. UPDATE EQUIPMENT STATUS
  -- ================================
  UPDATE company_equipment 
  SET 
    status = 'available',
    updated_at = now(),
    updated_by = current_user_id
  WHERE id = assignment_record.equipment_id;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Equipo desasignado exitosamente con garantías ACID',
    'assignment_id', assignment_id,
    'equipment_id', assignment_record.equipment_id,
    'equipment_number', assignment_record.equipment_number,
    'driver_id', assignment_record.driver_user_id,
    'unassigned_by', current_user_id,
    'unassigned_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  RAISE EXCEPTION 'Error en desasignación ACID de equipo: %', SQLERRM;
END;
$$;