-- ===============================================
-- ACID FUNCTIONS FOR COMPANY MANAGEMENT
-- ===============================================

-- Function: Create or Update Company with ACID validation
CREATE OR REPLACE FUNCTION public.create_or_update_company_with_validation(
  company_data JSONB,
  company_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  result_company RECORD;
  operation_type TEXT;
  is_superadmin BOOLEAN := false;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Check if user is superadmin
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND role = 'superadmin'
    AND is_active = true
  ) INTO is_superadmin;

  -- Determine operation type
  operation_type := CASE WHEN company_id IS NOT NULL THEN 'UPDATE' ELSE 'CREATE' END;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  
  IF operation_type = 'UPDATE' THEN
    -- For updates, check if user is company owner or superadmin
    IF NOT is_superadmin AND NOT EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = current_user_id
      AND company_id = company_id
      AND role IN ('company_owner', 'superadmin')
      AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Sin permisos para modificar esta empresa';
    END IF;

    -- Validate company exists
    IF NOT EXISTS (SELECT 1 FROM companies WHERE id = company_id) THEN
      RAISE EXCEPTION 'Empresa no encontrada';
    END IF;
  ELSE
    -- For creation, only superadmins can create companies
    IF NOT is_superadmin THEN
      RAISE EXCEPTION 'Solo los superadministradores pueden crear empresas';
    END IF;
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Validate required fields
  IF NULLIF(company_data->>'name', '') IS NULL THEN
    RAISE EXCEPTION 'name es requerido';
  END IF;

  IF NULLIF(company_data->>'street_address', '') IS NULL THEN
    RAISE EXCEPTION 'street_address es requerido';
  END IF;

  IF NULLIF(company_data->>'state_id', '') IS NULL THEN
    RAISE EXCEPTION 'state_id es requerido';
  END IF;

  IF NULLIF(company_data->>'zip_code', '') IS NULL THEN
    RAISE EXCEPTION 'zip_code es requerido';
  END IF;

  -- Check for duplicate company names (exclude current company if updating)
  IF EXISTS (
    SELECT 1 FROM companies
    WHERE LOWER(TRIM(name)) = LOWER(TRIM(company_data->>'name'))
    AND (company_id IS NULL OR id != company_id)
  ) THEN
    RAISE EXCEPTION 'Ya existe una empresa con el nombre "%"', company_data->>'name';
  END IF;

  -- Validate DOT number uniqueness if provided
  IF NULLIF(company_data->>'dot_number', '') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM companies
      WHERE dot_number = company_data->>'dot_number'
      AND (company_id IS NULL OR id != company_id)
    ) THEN
      RAISE EXCEPTION 'Ya existe una empresa con el número DOT "%"', company_data->>'dot_number';
    END IF;
  END IF;

  -- Validate MC number uniqueness if provided
  IF NULLIF(company_data->>'mc_number', '') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM companies
      WHERE mc_number = company_data->>'mc_number'
      AND (company_id IS NULL OR id != company_id)
    ) THEN
      RAISE EXCEPTION 'Ya existe una empresa con el número MC "%"', company_data->>'mc_number';
    END IF;
  END IF;

  -- ================================
  -- 3. CREATE OR UPDATE COMPANY
  -- ================================
  
  IF operation_type = 'CREATE' THEN
    INSERT INTO companies (
      name,
      street_address,
      state_id,
      zip_code,
      city_id,
      phone,
      email,
      dot_number,
      mc_number,
      ein,
      owner_name,
      owner_email,
      owner_phone,
      owner_title,
      plan_type,
      max_users,
      max_vehicles,
      default_payment_frequency,
      payment_cycle_start_day,
      payment_day,
      default_leasing_percentage,
      default_factoring_percentage,
      default_dispatching_percentage,
      load_assignment_criteria,
      contract_start_date,
      logo_url,
      status
    ) VALUES (
      company_data->>'name',
      company_data->>'street_address',
      (company_data->>'state_id')::CHAR(2),
      company_data->>'zip_code',
      NULLIF((company_data->>'city_id'), '')::UUID,
      NULLIF(company_data->>'phone', ''),
      NULLIF(company_data->>'email', ''),
      NULLIF(company_data->>'dot_number', ''),
      NULLIF(company_data->>'mc_number', ''),
      NULLIF(company_data->>'ein', ''),
      NULLIF(company_data->>'owner_name', ''),
      NULLIF(company_data->>'owner_email', ''),
      NULLIF(company_data->>'owner_phone', ''),
      NULLIF(company_data->>'owner_title', ''),
      COALESCE(company_data->>'plan_type', 'basic'),
      COALESCE((company_data->>'max_users')::INTEGER, 5),
      COALESCE((company_data->>'max_vehicles')::INTEGER, 10),
      COALESCE(company_data->>'default_payment_frequency', 'weekly'),
      COALESCE((company_data->>'payment_cycle_start_day')::INTEGER, 1),
      COALESCE(company_data->>'payment_day', 'friday'),
      COALESCE((company_data->>'default_leasing_percentage')::NUMERIC, 5.00),
      COALESCE((company_data->>'default_factoring_percentage')::NUMERIC, 3.00),
      COALESCE((company_data->>'default_dispatching_percentage')::NUMERIC, 5.00),
      COALESCE(company_data->>'load_assignment_criteria', 'delivery_date'),
      COALESCE((company_data->>'contract_start_date')::DATE, CURRENT_DATE),
      NULLIF(company_data->>'logo_url', ''),
      COALESCE(company_data->>'status', 'active')
    ) RETURNING * INTO result_company;
    
    -- Auto-assign creator as company owner if not superadmin creating for others
    IF NOT EXISTS (
      SELECT 1 FROM user_company_roles
      WHERE user_id = current_user_id
      AND company_id = result_company.id
    ) THEN
      INSERT INTO user_company_roles (
        user_id,
        company_id,
        role,
        is_active,
        assigned_by,
        assigned_at
      ) VALUES (
        current_user_id,
        result_company.id,
        'company_owner',
        true,
        current_user_id,
        now()
      );
    END IF;
  ELSE
    UPDATE companies SET
      name = company_data->>'name',
      street_address = company_data->>'street_address',
      state_id = (company_data->>'state_id')::CHAR(2),
      zip_code = company_data->>'zip_code',
      city_id = NULLIF((company_data->>'city_id'), '')::UUID,
      phone = NULLIF(company_data->>'phone', ''),
      email = NULLIF(company_data->>'email', ''),
      dot_number = NULLIF(company_data->>'dot_number', ''),
      mc_number = NULLIF(company_data->>'mc_number', ''),
      ein = NULLIF(company_data->>'ein', ''),
      owner_name = NULLIF(company_data->>'owner_name', ''),
      owner_email = NULLIF(company_data->>'owner_email', ''),
      owner_phone = NULLIF(company_data->>'owner_phone', ''),
      owner_title = NULLIF(company_data->>'owner_title', ''),
      plan_type = COALESCE(company_data->>'plan_type', plan_type),
      max_users = COALESCE((company_data->>'max_users')::INTEGER, max_users),
      max_vehicles = COALESCE((company_data->>'max_vehicles')::INTEGER, max_vehicles),
      default_payment_frequency = COALESCE(company_data->>'default_payment_frequency', default_payment_frequency),
      payment_cycle_start_day = COALESCE((company_data->>'payment_cycle_start_day')::INTEGER, payment_cycle_start_day),
      payment_day = COALESCE(company_data->>'payment_day', payment_day),
      default_leasing_percentage = COALESCE((company_data->>'default_leasing_percentage')::NUMERIC, default_leasing_percentage),
      default_factoring_percentage = COALESCE((company_data->>'default_factoring_percentage')::NUMERIC, default_factoring_percentage),
      default_dispatching_percentage = COALESCE((company_data->>'default_dispatching_percentage')::NUMERIC, default_dispatching_percentage),
      load_assignment_criteria = COALESCE(company_data->>'load_assignment_criteria', load_assignment_criteria),
      contract_start_date = COALESCE((company_data->>'contract_start_date')::DATE, contract_start_date),
      logo_url = COALESCE(NULLIF(company_data->>'logo_url', ''), logo_url),
      status = COALESCE(company_data->>'status', status),
      updated_at = now()
    WHERE id = company_id
    RETURNING * INTO result_company;
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', CASE 
      WHEN operation_type = 'CREATE' THEN 'Empresa creada exitosamente'
      ELSE 'Empresa actualizada exitosamente'
    END,
    'company', row_to_json(result_company),
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación ACID de empresa: %', SQLERRM;
END;
$$;

-- ===============================================
-- Function: Update Company Status with ACID validation
CREATE OR REPLACE FUNCTION public.update_company_status_with_validation(
  target_company_id UUID,
  new_status TEXT,
  status_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  result_company RECORD;
  is_superadmin BOOLEAN := false;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Check if user is superadmin
  SELECT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND role = 'superadmin'
    AND is_active = true
  ) INTO is_superadmin;

  -- ================================
  -- 1. VALIDATE PERMISSIONS
  -- ================================
  
  -- Check if user is company owner or superadmin
  IF NOT is_superadmin AND NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = target_company_id
    AND role IN ('company_owner', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para cambiar el estado de esta empresa';
  END IF;

  -- Validate company exists
  SELECT * INTO result_company FROM companies WHERE id = target_company_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Empresa no encontrada';
  END IF;

  -- ================================
  -- 2. VALIDATE BUSINESS RULES
  -- ================================
  
  -- Validate status values
  IF new_status NOT IN ('active', 'inactive', 'suspended', 'pending') THEN
    RAISE EXCEPTION 'Estado no válido: %. Estados permitidos: active, inactive, suspended, pending', new_status;
  END IF;

  -- Prevent status change if already in that status
  IF result_company.status = new_status THEN
    RAISE EXCEPTION 'La empresa ya está en estado "%"', new_status;
  END IF;

  -- ================================
  -- 3. UPDATE COMPANY STATUS
  -- ================================
  
  UPDATE companies 
  SET 
    status = new_status,
    updated_at = now()
  WHERE id = target_company_id
  RETURNING * INTO result_company;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Estado de empresa actualizado exitosamente',
    'company_id', target_company_id,
    'old_status', result_company.status,
    'new_status', new_status,
    'status_reason', status_reason,
    'updated_by', current_user_id,
    'updated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en actualización ACID de estado de empresa: %', SQLERRM;
END;
$$;