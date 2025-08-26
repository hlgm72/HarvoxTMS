-- Continue refactoring payment functions and remaining smaller functions

-- 6. Update mark_driver_as_paid function
CREATE OR REPLACE FUNCTION public.mark_driver_as_paid(calculation_id uuid, payment_method_used text DEFAULT NULL::text, payment_ref text DEFAULT NULL::text, notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  updated_record RECORD;
BEGIN
  -- Verificar que el cálculo existe y no está ya pagado
  SELECT * INTO updated_record
  FROM driver_period_calculations
  WHERE id = calculation_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'ERROR_CALCULATION_NOT_FOUND');
  END IF;
  
  IF updated_record.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'message', 'ERROR_ALREADY_PAID');
  END IF;
  
  -- Marcar como pagado
  UPDATE driver_period_calculations
  SET 
    payment_status = 'paid',
    paid_at = now(),
    paid_by = auth.uid(),
    payment_method = payment_method_used,
    payment_reference = payment_ref,
    payment_notes = notes,
    updated_at = now()
  WHERE id = calculation_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Conductor marcado como pagado exitosamente',
    'calculation_id', calculation_id,
    'paid_at', now()
  );
END;
$function$;

-- 7. Update close_payment_period_when_complete function
CREATE OR REPLACE FUNCTION public.close_payment_period_when_complete(period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  can_close_result JSONB;
  period_record RECORD;
BEGIN
  -- Verificar si se puede cerrar
  SELECT can_close_payment_period(period_id) INTO can_close_result;
  
  IF NOT (can_close_result->>'can_close')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'ERROR_CANNOT_CLOSE_PERIOD',
      'details', can_close_result
    );
  END IF;
  
  -- Verificar que el período existe y no está ya cerrado
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'ERROR_PERIOD_NOT_FOUND');
  END IF;
  
  IF period_record.is_locked THEN
    RETURN jsonb_build_object('success', false, 'message', 'ERROR_PERIOD_ALREADY_CLOSED');
  END IF;
  
  -- Cerrar el período
  UPDATE company_payment_periods
  SET 
    status = 'closed',
    is_locked = true,
    locked_at = now(),
    locked_by = auth.uid(),
    updated_at = now()
  WHERE id = period_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Período cerrado exitosamente',
    'period_id', period_id,
    'drivers_paid', (can_close_result->>'paid_drivers')::INTEGER,
    'closed_at', now()
  );
END;
$function$;

-- 8. Update create_or_update_user_profile_with_validation function
CREATE OR REPLACE FUNCTION public.create_or_update_user_profile_with_validation(user_data jsonb, role_data jsonb DEFAULT NULL::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Extract target user ID
  target_user_id := (user_data->>'user_id')::UUID;
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_ID_REQUIRED';
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
      RAISE EXCEPTION 'ERROR_COMPANY_ID_REQUIRED';
    END IF;

    -- Check if current user has admin rights in target company
    IF NOT EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = current_user_id
      AND company_id = target_company_id
      AND role IN ('company_owner', 'operations_manager', 'superadmin')
      AND is_active = true
    ) THEN
      RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_MANAGE_USERS';
    END IF;
  END IF;

  -- For updates, validate target user exists in auth
  IF operation_type = 'UPDATE' THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = target_user_id) THEN
      RAISE EXCEPTION 'ERROR_AUTH_USER_NOT_FOUND';
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
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$function$;