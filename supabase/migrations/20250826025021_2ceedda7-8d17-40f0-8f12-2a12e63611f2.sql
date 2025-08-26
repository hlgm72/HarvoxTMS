-- Migration: Replace hardcoded Spanish messages with error codes in database functions
-- This enables proper internationalization of error messages

-- 1. Update create_user_with_company_role_validation function
CREATE OR REPLACE FUNCTION public.create_user_with_company_role_validation(user_data jsonb, company_role_data jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result_user RECORD;
  result_role RECORD;
  current_user_id UUID;
  target_company_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
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
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_MANAGE_USERS';
  END IF;

  -- Validate that the target user exists in auth.users
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = (user_data->>'user_id')::UUID
  ) THEN
    RAISE EXCEPTION 'ERROR_AUTH_USER_NOT_FOUND';
  END IF;

  -- Check if user already has a role in this company
  IF EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (user_data->>'user_id')::UUID
    AND company_id = target_company_id
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_USER_ALREADY_HAS_ROLE';
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
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$function$;

-- 2. Update create_or_update_equipment_with_validation function
CREATE OR REPLACE FUNCTION public.create_or_update_equipment_with_validation(equipment_data jsonb, equipment_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  result_equipment RECORD;
  operation_type TEXT;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Extract company_id from equipment_data
  target_company_id := (equipment_data->>'company_id')::UUID;
  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_COMPANY_ID_REQUIRED';
  END IF;

  -- Determine operation type
  operation_type := CASE WHEN equipment_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

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
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_MANAGE_EQUIPMENT';
  END IF;

  -- Determine operation type
  operation_type := CASE WHEN equipment_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Validate required fields
  IF NULLIF(equipment_data->>'equipment_number', '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_EQUIPMENT_NUMBER_REQUIRED';
  END IF;

  IF NULLIF(equipment_data->>'equipment_type', '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_EQUIPMENT_TYPE_REQUIRED';
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
      RAISE EXCEPTION 'ERROR_EQUIPMENT_NOT_FOUND';
    END IF;
  END IF;

  -- Check for duplicate equipment numbers within company (exclude current equipment if updating)
  IF EXISTS (
    SELECT 1 FROM company_equipment
    WHERE company_id = target_company_id
    AND equipment_number = equipment_data->>'equipment_number'
    AND (equipment_id IS NULL OR id != equipment_id)
  ) THEN
    RAISE EXCEPTION 'ERROR_EQUIPMENT_NUMBER_EXISTS:number:%', equipment_data->>'equipment_number';
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
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$function$;