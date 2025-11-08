-- ============================================================================
-- Corregir COALESCE type mismatch en update_other_income_with_validation
-- El problema: update_data->>'applied_to_role' retorna TEXT pero applied_to_role es user_role enum
-- ============================================================================

DROP FUNCTION IF EXISTS public.update_other_income_with_validation(update_data JSONB);

CREATE FUNCTION public.update_other_income_with_validation(
  update_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  target_income_id UUID;
  old_user_id UUID;
  new_user_id UUID;
  target_company_id UUID;
  new_company_id UUID;
  old_payroll_id UUID;
  new_payroll_id UUID;
  new_payment_period_id UUID;
  result_income RECORD;
  new_amount NUMERIC;
  new_income_date DATE;
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
    payment_period_id
  INTO old_user_id, new_payment_period_id
  FROM other_income
  WHERE id = target_income_id;

  IF old_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_INCOME_NOT_FOUND';
  END IF;

  -- ✅ 4. Obtener company_id del usuario actual
  SELECT company_id INTO target_company_id
  FROM user_company_roles
  WHERE user_id = old_user_id
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

  -- ✅ 6. Si se cambia el usuario, validar el nuevo usuario
  IF update_data->>'user_id' IS NOT NULL AND (update_data->>'user_id')::UUID != old_user_id THEN
    new_user_id := (update_data->>'user_id')::UUID;
    
    -- Validar que el nuevo usuario existe y pertenece a la misma compañía
    SELECT company_id INTO new_company_id
    FROM user_company_roles
    WHERE user_id = new_user_id
      AND is_active = true
    LIMIT 1;
    
    IF new_company_id IS NULL THEN
      RAISE EXCEPTION 'ERROR_NEW_USER_NOT_FOUND';
    END IF;
    
    IF new_company_id != target_company_id THEN
      RAISE EXCEPTION 'ERROR_USER_DIFFERENT_COMPANY';
    END IF;
    
    RAISE NOTICE '🔄 Cambiando usuario de % a %', old_user_id, new_user_id;
    
    -- Obtener o crear el payment_period para el nuevo usuario
    new_income_date := COALESCE((update_data->>'income_date')::DATE, (SELECT income_date FROM other_income WHERE id = target_income_id));
    
    SELECT create_payment_period_if_needed(
      target_company_id,
      new_income_date,
      new_user_id
    ) INTO new_payment_period_id;
    
  ELSE
    new_user_id := old_user_id;
  END IF;

  -- ✅ 7. Guardar el payroll_id del usuario anterior para recalcular
  SELECT up.id INTO old_payroll_id
  FROM user_payrolls up
  INNER JOIN other_income oi ON oi.payment_period_id = up.company_payment_period_id
  WHERE oi.id = target_income_id
    AND up.user_id = old_user_id
  LIMIT 1;

  -- ✅ 8. Actualizar other_income con CAST explícito para applied_to_role
  UPDATE other_income
  SET
    user_id = COALESCE(new_user_id, user_id),
    -- 🔧 FIX: Cast explícito de TEXT a user_role para evitar error de COALESCE
    applied_to_role = COALESCE((update_data->>'applied_to_role')::user_role, applied_to_role),
    description = COALESCE(update_data->>'description', description),
    amount = COALESCE((update_data->>'amount')::NUMERIC, amount),
    income_type = COALESCE(update_data->>'income_type', income_type),
    income_date = COALESCE((update_data->>'income_date')::DATE, income_date),
    payment_period_id = COALESCE(new_payment_period_id, payment_period_id),
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

  -- ✅ 9. Recalcular el payroll del usuario ANTERIOR (si cambió de usuario)
  IF new_user_id != old_user_id AND old_payroll_id IS NOT NULL THEN
    BEGIN
      PERFORM calculate_user_payment_period_with_validation(old_payroll_id);
      RAISE NOTICE '✅ Payroll del usuario anterior recalculado';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ Error recalculando payroll del usuario anterior: %', SQLERRM;
    END;
  END IF;

  -- ✅ 10. Obtener user_payroll_id del usuario NUEVO para recalcular
  SELECT up.id INTO new_payroll_id
  FROM user_payrolls up
  WHERE up.user_id = result_income.user_id
    AND up.company_payment_period_id = result_income.payment_period_id
  LIMIT 1;

  -- ✅ 11. Recalcular el payroll del usuario NUEVO
  IF new_payroll_id IS NOT NULL THEN
    BEGIN
      PERFORM calculate_user_payment_period_with_validation(new_payroll_id);
      RAISE NOTICE '✅ Payroll del usuario nuevo recalculado';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ Error recalculando payroll del usuario nuevo: %', SQLERRM;
    END;
  END IF;

  -- ✅ 12. Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'operation', 'UPDATE',
    'message', 'Otro ingreso actualizado exitosamente',
    'other_income', row_to_json(result_income),
    'old_user_id', old_user_id,
    'new_user_id', result_income.user_id,
    'user_changed', old_user_id != result_income.user_id,
    'old_payroll_id', old_payroll_id,
    'new_payroll_id', new_payroll_id,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.update_other_income_with_validation IS 
'Actualiza un other income con validaciones completas.
✅ Permite cambiar el usuario (user_id)
✅ Permite cambiar el tipo de usuario (applied_to_role: driver/dispatcher)
✅ Recalcula payrolls de ambos usuarios (anterior y nuevo)
✅ Actualiza payment_period_id automáticamente si cambia el usuario
✅ Validación de permisos y datos
🔧 FIX: Cast explícito para applied_to_role para evitar error de tipos';