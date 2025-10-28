-- Corregir delete_other_income_with_validation
-- El problema: payment_period_id ahora referencia company_payment_periods, no user_payrolls

CREATE OR REPLACE FUNCTION public.delete_other_income_with_validation(
  income_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  target_user_id UUID;
  target_company_id UUID;
  v_company_payment_period_id UUID;
  v_user_payroll_id UUID;
BEGIN
  -- ✅ 1. Autenticación
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- ✅ 2. Obtener información del ingreso
  SELECT 
    oi.user_id,
    oi.payment_period_id
  INTO 
    target_user_id,
    v_company_payment_period_id
  FROM other_income oi
  WHERE oi.id = income_id;

  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_OTHER_INCOME_NOT_FOUND';
  END IF;

  RAISE NOTICE '✅ Other income encontrado: user_id=%, cpp_id=%', target_user_id, v_company_payment_period_id;

  -- ✅ 3. Obtener company_id del usuario
  SELECT company_id INTO target_company_id
  FROM user_company_roles
  WHERE user_id = target_user_id
    AND is_active = true
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_ASSOCIATED_WITH_COMPANY';
  END IF;

  -- ✅ 4. Validar permisos
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
      AND company_id = target_company_id
      AND role IN ('company_owner', 'operations_manager', 'superadmin')
      AND is_active = true
  ) THEN
    RAISE EXCEPTION 'ERROR_NO_PERMISSIONS_DELETE_OTHER_INCOME';
  END IF;

  -- ✅ 5. Obtener user_payroll_id para recalcular
  SELECT id INTO v_user_payroll_id
  FROM user_payrolls
  WHERE user_id = target_user_id
    AND company_payment_period_id = v_company_payment_period_id
  LIMIT 1;

  RAISE NOTICE '✅ User payroll encontrado: %', v_user_payroll_id;

  -- ✅ 6. Eliminar el registro
  DELETE FROM other_income WHERE id = income_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ERROR_OTHER_INCOME_NOT_FOUND';
  END IF;

  RAISE NOTICE '✅ Other income eliminado: %', income_id;

  -- ✅ 7. Recalcular el payroll si existe
  IF v_user_payroll_id IS NOT NULL THEN
    BEGIN
      PERFORM calculate_user_payment_period_with_validation(v_user_payroll_id);
      RAISE NOTICE '✅ Payroll recalculado exitosamente';
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '⚠️ Error recalculando payroll: %', SQLERRM;
    END;
  ELSE
    RAISE WARNING '⚠️ No se encontró user_payroll para recalcular';
  END IF;

  -- ✅ 8. Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'operation', 'DELETE',
    'message', 'Otro ingreso eliminado exitosamente',
    'other_income_id', income_id,
    'company_payment_period_id', v_company_payment_period_id,
    'user_payroll_id', v_user_payroll_id,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_OPERATION_FAILED: %', SQLERRM;
END;
$$;