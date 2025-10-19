
-- ============================================================================
-- FIX: create_expense_instance_with_validation siguiendo patrón on-demand
-- ============================================================================
-- Ahora crea automáticamente company_payment_period y user_payroll si no existen
-- Similar a como funcionan loads y fuel_expenses

CREATE OR REPLACE FUNCTION public.create_expense_instance_with_validation(expense_data jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  target_user_id UUID;
  target_company_id UUID;
  target_expense_date DATE;
  v_company_payment_period_id UUID;
  v_user_payroll_id UUID;
  result_expense RECORD;
BEGIN
  -- ✅ 1. Autenticación
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- ✅ 2. Validar campos requeridos
  IF NULLIF((expense_data->>'amount')::TEXT, '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_AMOUNT_REQUIRED';
  END IF;

  IF NULLIF((expense_data->>'expense_type_id')::TEXT, '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_EXPENSE_TYPE_REQUIRED';
  END IF;

  IF NULLIF((expense_data->>'user_id')::TEXT, '') IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_ID_REQUIRED';
  END IF;

  -- ✅ 3. Extraer datos necesarios
  target_user_id := (expense_data->>'user_id')::UUID;
  target_expense_date := COALESCE((expense_data->>'expense_date')::DATE, CURRENT_DATE);

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
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_MANAGE_EXPENSE_INSTANCES';
  END IF;

  -- ✅ 6. CREAR/OBTENER company_payment_period (patrón on-demand)
  RAISE NOTICE '🔍 Buscando/creando company_payment_period para company % fecha %', 
    target_company_id, target_expense_date;

  SELECT create_company_payment_period_if_needed(
    target_company_id,
    target_expense_date,
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

  -- ✅ 8. Crear expense_instance
  INSERT INTO expense_instances (
    payment_period_id,
    expense_type_id,
    user_id,
    amount,
    description,
    expense_date,
    priority,
    is_critical,
    status,
    created_by,
    applied_by,
    applied_at
  ) VALUES (
    v_user_payroll_id,  -- Ahora usamos el user_payroll_id correcto
    (expense_data->>'expense_type_id')::UUID,
    target_user_id,
    (expense_data->>'amount')::NUMERIC,
    expense_data->>'description',
    target_expense_date,
    COALESCE((expense_data->>'priority')::INTEGER, 5),
    COALESCE((expense_data->>'is_critical')::BOOLEAN, false),
    'applied',
    current_user_id,
    current_user_id,
    now()
  ) RETURNING * INTO result_expense;

  RAISE NOTICE '✅ Expense instance creada: %', result_expense.id;

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
    'message', 'Deducción creada exitosamente',
    'expense', row_to_json(result_expense),
    'company_payment_period_id', v_company_payment_period_id,
    'user_payroll_id', v_user_payroll_id,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.create_expense_instance_with_validation IS 
'Crea una deducción manual siguiendo el patrón on-demand.
✅ Crea automáticamente company_payment_period si no existe
✅ Crea automáticamente user_payroll si no existe
✅ Recalcula el payroll después de crear la deducción
✅ Validación completa de permisos y datos';
