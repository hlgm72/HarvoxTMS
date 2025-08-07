-- ===============================================
-- ACID FUNCTIONS FOR USER MANAGEMENT & AUTHENTICATION
-- ===============================================

-- Function: Create or Update User with Company Role (Enhanced ACID)
CREATE OR REPLACE FUNCTION public.create_or_update_user_profile_with_validation(
  user_data JSONB,
  role_data JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  target_user_id UUID;
  target_company_id UUID;
  result_profile RECORD;
  result_role RECORD;
  operation_type TEXT;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Extract target user ID
  target_user_id := (user_data->>'user_id')::UUID;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id es requerido';
  END IF;

  -- Determine operation type
  operation_type := CASE 
    WHEN EXISTS (SELECT 1 FROM driver_profiles WHERE user_id = target_user_id) 
    THEN 'UPDATE' 
    ELSE 'CREATE' 
  END;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  
  -- If creating/updating role, validate company permissions
  IF role_data IS NOT NULL THEN
    target_company_id := (role_data->>'company_id')::UUID;
    IF target_company_id IS NULL THEN
      RAISE EXCEPTION 'company_id es requerido cuando se especifica role_data';
    END IF;

    -- Check if current user has admin rights in target company
    IF NOT EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = current_user_id
      AND company_id = target_company_id
      AND role IN ('company_owner', 'operations_manager', 'superadmin')
      AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Sin permisos para gestionar usuarios en esta empresa';
    END IF;
  END IF;

  -- For updates, validate target user exists in auth
  IF operation_type = 'UPDATE' THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
      RAISE EXCEPTION 'El usuario especificado no existe en el sistema de autenticación';
    END IF;
  END IF;

  -- ================================
  -- 2. CREATE/UPDATE DRIVER PROFILE
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
    target_user_id,
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
  RETURNING * INTO result_profile;

  -- ================================
  -- 3. ASSIGN/UPDATE COMPANY ROLE (if provided)
  -- ================================
  
  IF role_data IS NOT NULL THEN
    -- Deactivate existing roles in the target company
    UPDATE user_company_roles
    SET is_active = false, updated_at = now()
    WHERE user_id = target_user_id 
    AND company_id = target_company_id;

    -- Create new active role
    INSERT INTO user_company_roles (
      user_id,
      company_id,
      role,
      is_active,
      assigned_by,
      assigned_at
    ) VALUES (
      target_user_id,
      target_company_id,
      (role_data->>'role')::user_role,
      true,
      current_user_id,
      now()
    ) RETURNING * INTO result_role;

    -- Create owner operator record if driver role
    IF (role_data->>'role') = 'driver' THEN
      INSERT INTO owner_operators (
        user_id,
        company_id,
        operator_type,
        contract_start_date,
        is_active
      ) VALUES (
        target_user_id,
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
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', CASE 
      WHEN operation_type = 'CREATE' THEN 'Usuario creado exitosamente'
      ELSE 'Usuario actualizado exitosamente'
    END,
    'user_profile', row_to_json(result_profile),
    'company_role', CASE WHEN result_role IS NOT NULL THEN row_to_json(result_role) ELSE NULL END,
    'owner_operator_created', role_data IS NOT NULL AND (role_data->>'role') = 'driver',
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación ACID de usuario: %', SQLERRM;
END;
$$;

-- ===============================================
-- Function: Update User Role with ACID validation
CREATE OR REPLACE FUNCTION public.update_user_role_with_validation(
  target_user_id UUID,
  target_company_id UUID,
  new_role user_role,
  status_active BOOLEAN DEFAULT true
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  result_role RECORD;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  
  -- Check if current user has admin rights in target company
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para gestionar roles en esta empresa';
  END IF;

  -- Validate target user exists in auth
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'El usuario especificado no existe';
  END IF;

  -- Prevent self-role modification for safety
  IF current_user_id = target_user_id THEN
    RAISE EXCEPTION 'No puedes modificar tu propio rol por seguridad';
  END IF;

  -- ================================
  -- 2. UPDATE ROLE ATOMICALLY
  -- ================================
  
  -- Update or create role record
  INSERT INTO user_company_roles (
    user_id,
    company_id,
    role,
    is_active,
    assigned_by,
    assigned_at
  ) VALUES (
    target_user_id,
    target_company_id,
    new_role,
    status_active,
    current_user_id,
    now()
  )
  ON CONFLICT (user_id, company_id) DO UPDATE SET
    role = EXCLUDED.role,
    is_active = EXCLUDED.is_active,
    assigned_by = EXCLUDED.assigned_by,
    assigned_at = EXCLUDED.assigned_at,
    updated_at = now()
  RETURNING * INTO result_role;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Rol de usuario actualizado exitosamente',
    'user_role', row_to_json(result_role),
    'updated_by', current_user_id,
    'updated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en actualización ACID de rol: %', SQLERRM;
END;
$$;

-- ===============================================
-- Function: Deactivate User with ACID validation
CREATE OR REPLACE FUNCTION public.deactivate_user_with_validation(
  target_user_id UUID,
  target_company_id UUID,
  deactivation_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  affected_roles INTEGER := 0;
  affected_profiles INTEGER := 0;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  
  -- Check if current user has admin rights in target company
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para desactivar usuarios en esta empresa';
  END IF;

  -- Prevent self-deactivation for safety
  IF current_user_id = target_user_id THEN
    RAISE EXCEPTION 'No puedes desactivar tu propia cuenta por seguridad';
  END IF;

  -- ================================
  -- 2. DEACTIVATE USER ATOMICALLY
  -- ================================
  
  -- Deactivate user roles in the company
  UPDATE user_company_roles
  SET 
    is_active = false,
    updated_at = now()
  WHERE user_id = target_user_id 
  AND company_id = target_company_id
  AND is_active = true;
  
  GET DIAGNOSTICS affected_roles = ROW_COUNT;

  -- Deactivate driver profile if exists
  UPDATE driver_profiles
  SET 
    is_active = false,
    updated_at = now()
  WHERE user_id = target_user_id
  AND is_active = true;
  
  GET DIAGNOSTICS affected_profiles = ROW_COUNT;

  -- Deactivate owner operator record if exists
  UPDATE owner_operators
  SET 
    is_active = false,
    updated_at = now()
  WHERE user_id = target_user_id
  AND company_id = target_company_id
  AND is_active = true;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Usuario desactivado exitosamente',
    'user_id', target_user_id,
    'company_id', target_company_id,
    'affected_roles', affected_roles,
    'affected_profiles', affected_profiles,
    'deactivation_reason', deactivation_reason,
    'deactivated_by', current_user_id,
    'deactivated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en desactivación ACID de usuario: %', SQLERRM;
END;
$$;