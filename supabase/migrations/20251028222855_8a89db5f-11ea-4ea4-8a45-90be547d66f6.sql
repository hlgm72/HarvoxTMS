-- Agregar validación de amount > 0 en las funciones de other_income

-- ============================================================================
-- Actualizar CREATE OTHER INCOME para validar amount > 0
-- ============================================================================
CREATE OR REPLACE FUNCTION public.create_other_income_with_validation(
  income_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  target_user_id UUID;
  target_company_id UUID;
  target_income_date DATE;
  v_company_payment_period_id UUID;
  v_user_payroll_id UUID;
  result_income RECORD;
BEGIN
  -- ✅ 1. Autenticación
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- ✅ 2. Validar campos requeridos
  IF NULLIF((income_data->>'amount')::TEXT, '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_AMOUNT_REQUIRED';
  END IF;

  -- ✅ 2.1 Validar que amount sea mayor que 0
  IF (income_data->>'amount')::NUMERIC <= 0 THEN
    RAISE EXCEPTION 'ERROR_AMOUNT_MUST_BE_POSITIVE';
  END IF;

  IF NULLIF((income_data->>'description')::TEXT, '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_DESCRIPTION_REQUIRED';
  END IF;

  IF NULLIF((income_data->>'user_id')::TEXT, '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_ID_REQUIRED';
  END IF;

  IF NULLIF((income_data->>'income_type')::TEXT, '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_INCOME_TYPE_REQUIRED';
  END IF;

  -- ✅ 3. Extraer datos necesarios
  target_user_id := (income_data->>'user_id')::UUID;
  target_income_date := COALESCE((income_data->>'income_date')::DATE, CURRENT_DATE);

  -- ✅ 4. Obtener company_id del usuario
  SELECT company_id INTO target_company_id
  FROM user_company_roles
  WHERE user_id = target_user_id
    AND is_active = true
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_ASSOCIATED_WITH_COMPANY';
  END IF;

  -- ✅ 5. Validar permisos del usuario que crea
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
      AND company_id = target_company_id
      AND role IN ('company_owner', 'operations_manager', 'superadmin')
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_MANAGE_OTHER_INCOME';
  END IF;

  -- ✅ 6. CREAR/OBTENER company_payment_period (patrón on-demand)
  RAISE NOTICE '🔍 Buscando/creando company_payment_period para company % fecha %', 
    target_company_id, target_income_date;

  SELECT create_company_payment_period_if_needed(
    target_company_id,
    target_income_date,
    current_user_id
  ) INTO v_company_payment_period_id;

  IF v_company_payment_period_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_COULD_NOT_CREATE_PAYMENT_PERIOD';
  END IF;

  RAISE NOTICE '✅ Company payment period: %', v_company_payment_period_id;

  -- ✅ 7. CREAR/OBTENER user_payroll (patrón on-demand)
  SELECT id INTO v_user_payroll_id
  FROM user_payrolls
  WHERE user_id = target_user_id
    AND company_payment_period_id = v_company_payment_period_id
  LIMIT 1;

  IF v_user_payroll_id IS NULL THEN
    RAISE NOTICE '📝 Creando nuevo user_payroll para usuario % en período %',
      target_user_id, v_company_payment_period_id;

    INSERT INTO user_payrolls (
      user_id,
      company_payment_period_id,
      company_id,
      gross_earnings,
      fuel_expenses,
      total_deductions,
      other_income,
      net_payment,
      has_negative_balance,
      payment_status,
      status,
      calculated_by
    ) VALUES (
      target_user_id,
      v_company_payment_period_id,
      target_company_id,
      0, 0, 0, 0, 0,
      false,
      'calculated',
      'open',
      current_user_id
    ) RETURNING id INTO v_user_payroll_id;

    RAISE NOTICE '✅ Nuevo user_payroll creado: %', v_user_payroll_id;
  ELSE
    RAISE NOTICE '✅ User_payroll existente: %', v_user_payroll_id;
  END IF;

  -- ✅ 8. Crear other_income
  INSERT INTO other_income (
    payment_period_id,
    user_id,
    description,
    amount,
    income_type,
    income_date,
    reference_number,
    notes,
    applied_to_role,
    status,
    created_by
  ) VALUES (
    v_company_payment_period_id,
    target_user_id,
    income_data->>'description',
    (income_data->>'amount')::NUMERIC,
    income_data->>'income_type',
    target_income_date,
    income_data->>'reference_number',
    income_data->>'notes',
    (income_data->>'applied_to_role')::user_role,
    COALESCE(income_data->>'status', 'pending'),
    current_user_id
  ) RETURNING * INTO result_income;

  RAISE NOTICE '✅ Other income creado: %', result_income.id;

  -- ✅ 9. Recalcular el payroll
  BEGIN
    PERFORM calculate_user_payment_period_with_validation(v_user_payroll_id);
    RAISE NOTICE '✅ Payroll recalculado exitosamente';
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '⚠️ Error recalculando payroll: %', SQLERRM;
  END;

  -- ✅ 10. Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'operation', 'CREATE',
    'message', 'Otro ingreso creado exitosamente',
    'other_income', row_to_json(result_income),
    'company_payment_period_id', v_company_payment_period_id,
    'user_payroll_id', v_user_payroll_id,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$$;

-- ============================================================================
-- Actualizar UPDATE OTHER INCOME para validar amount > 0
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_other_income_with_validation(
  update_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  target_income_id UUID;
  target_user_id UUID;
  target_company_id UUID;
  v_user_payroll_id UUID;
  result_income RECORD;
  old_amount NUMERIC;
  new_amount NUMERIC;
BEGIN
  -- ✅ 1. Autenticación
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- ✅ 2. Validar ID requerido
  IF NULLIF((update_data->>'id')::TEXT, '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_ID_REQUIRED';
  END IF;
  
  target_income_id := (update_data->>'id')::UUID;

  -- ✅ 2.1 Si se proporciona amount, validar que sea mayor que 0
  IF update_data->>'amount' IS NOT NULL THEN
    new_amount := (update_data->>'amount')::NUMERIC;
    IF new_amount <= 0 THEN
      RAISE EXCEPTION 'ERROR_AMOUNT_MUST_BE_POSITIVE';
    END IF;
  END IF;

  -- ✅ 3. Obtener información del ingreso actual
  SELECT 
    user_id,
    amount
  INTO target_user_id, old_amount
  FROM other_income
  WHERE id = target_income_id;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_INCOME_NOT_FOUND';
  END IF;

  -- ✅ 4. Obtener company_id del usuario
  SELECT company_id INTO target_company_id
  FROM user_company_roles
  WHERE user_id = target_user_id
    AND is_active = true
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_ASSOCIATED_WITH_COMPANY';
  END IF;

  -- ✅ 5. Validar permisos
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
      AND company_id = target_company_id
      AND role IN ('company_owner', 'operations_manager', 'superadmin')
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_MANAGE_OTHER_INCOME';
  END IF;

  -- ✅ 6. Actualizar other_income
  UPDATE other_income
  SET
    description = COALESCE(update_data->>'description', description),
    amount = COALESCE((update_data->>'amount')::NUMERIC, amount),
    income_type = COALESCE(update_data->>'income_type', income_type),
    income_date = COALESCE((update_data->>'income_date')::DATE, income_date),
    reference_number = CASE 
      WHEN update_data ? 'reference_number' THEN update_data->>'reference_number'
      ELSE reference_number
    END,
    notes = CASE 
      WHEN update_data ? 'notes' THEN update_data->>'notes'
      ELSE notes
    END,
    updated_at = now()
  WHERE id = target_income_id
  RETURNING * INTO result_income;

  RAISE NOTICE '✅ Other income actualizado: %', result_income.id;

  -- ✅ 7. Obtener user_payroll_id para recalcular
  SELECT up.id INTO v_user_payroll_id
  FROM user_payrolls up
  WHERE up.user_id = target_user_id
    AND up.company_payment_period_id = result_income.payment_period_id
  LIMIT 1;

  -- ✅ 8. Recalcular el payroll si existe
  IF v_user_payroll_id IS NOT NULL THEN
    BEGIN
      PERFORM calculate_user_payment_period_with_validation(v_user_payroll_id);
      RAISE NOTICE '✅ Payroll recalculado exitosamente';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ Error recalculando payroll: %', SQLERRM;
    END;
  END IF;

  -- ✅ 9. Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'operation', 'UPDATE',
    'message', 'Otro ingreso actualizado exitosamente',
    'other_income', row_to_json(result_income),
    'user_payroll_id', v_user_payroll_id,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$$;