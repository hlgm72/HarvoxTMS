-- Eliminar funciones existentes que necesitan cambios
DROP FUNCTION IF EXISTS public.recalculate_payment_period_totals(uuid);
DROP FUNCTION IF EXISTS public.cleanup_empty_payment_period(uuid);

-- Recrear cleanup_empty_payment_period SIN referencias a is_locked
CREATE FUNCTION public.cleanup_empty_payment_period(target_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  period_record RECORD;
  has_loads BOOLEAN := false;
  has_fuel_expenses BOOLEAN := false;
  has_deductions BOOLEAN := false;
  has_other_income BOOLEAN := false;
  deleted_calculations INTEGER := 0;
  deleted_expenses INTEGER := 0;
  deleted_periods INTEGER := 0;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = target_period_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período no encontrado');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = period_record.company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RETURN jsonb_build_object('success', false, 'message', 'Sin permisos suficientes');
  END IF;

  SELECT EXISTS (SELECT 1 FROM loads WHERE payment_period_id = target_period_id) INTO has_loads;
  SELECT EXISTS (SELECT 1 FROM fuel_expenses WHERE payment_period_id = target_period_id) INTO has_fuel_expenses;
  SELECT EXISTS (
    SELECT 1 FROM expense_instances ei
    WHERE ei.payment_period_id IN (
      SELECT id FROM user_payrolls WHERE company_payment_period_id = target_period_id
    )
  ) INTO has_deductions;
  SELECT EXISTS (
    SELECT 1 FROM user_payrolls 
    WHERE company_payment_period_id = target_period_id AND other_income > 0
  ) INTO has_other_income;

  IF NOT (has_loads OR has_fuel_expenses OR has_deductions OR has_other_income) THEN
    DELETE FROM expense_instances
    WHERE payment_period_id IN (
      SELECT id FROM user_payrolls WHERE company_payment_period_id = target_period_id
    );
    GET DIAGNOSTICS deleted_expenses = ROW_COUNT;

    DELETE FROM user_payrolls WHERE company_payment_period_id = target_period_id;
    GET DIAGNOSTICS deleted_calculations = ROW_COUNT;

    DELETE FROM company_payment_periods WHERE id = target_period_id;
    GET DIAGNOSTICS deleted_periods = ROW_COUNT;

    INSERT INTO archive_logs (
      operation_type, table_name, details, triggered_by, records_affected, status
    ) VALUES (
      'MANUAL_CLEANUP_EMPTY_PERIOD', 'company_payment_periods',
      jsonb_build_object(
        'period_id', target_period_id,
        'company_id', period_record.company_id,
        'deleted_calculations', deleted_calculations,
        'deleted_expenses', deleted_expenses
      ),
      current_user_id, deleted_calculations + deleted_expenses + deleted_periods, 'completed'
    );

    RETURN jsonb_build_object(
      'success', true, 'action', 'deleted', 'message', 'Período vacío eliminado',
      'deleted_calculations', deleted_calculations,
      'deleted_expenses', deleted_expenses,
      'deleted_periods', deleted_periods
    );
  ELSE
    RETURN jsonb_build_object(
      'success', false, 'message', 'Período tiene datos asociados',
      'has_loads', has_loads, 'has_fuel_expenses', has_fuel_expenses,
      'has_deductions', has_deductions, 'has_other_income', has_other_income
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'message', SQLERRM);
END;
$function$;

-- Recrear recalculate_payment_period_totals
CREATE FUNCTION public.recalculate_payment_period_totals(target_period_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  calculation_record RECORD;
  updated_count INTEGER := 0;
BEGIN
  FOR calculation_record IN 
    SELECT id FROM user_payrolls WHERE company_payment_period_id = target_period_id
  LOOP
    BEGIN
      PERFORM calculate_user_payment_period_with_validation(calculation_record.id);
      updated_count := updated_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error recalculando payroll %: %', calculation_record.id, SQLERRM;
    END;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'updated_calculations', updated_count, 'period_id', target_period_id);
END;
$function$;

-- Crear función auxiliar
CREATE OR REPLACE FUNCTION public.can_modify_period(period_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  has_paid_users boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM user_payrolls
    WHERE company_payment_period_id = period_id AND payment_status = 'paid'
  ) INTO has_paid_users;
  RETURN NOT has_paid_users;
END;
$function$;