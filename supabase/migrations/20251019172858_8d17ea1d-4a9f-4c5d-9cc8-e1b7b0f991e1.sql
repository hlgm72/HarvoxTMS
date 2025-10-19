-- Función para eliminar expense_instance con limpieza automática de payrolls vacíos
CREATE OR REPLACE FUNCTION public.delete_expense_instance_with_cleanup(expense_instance_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_payment_period_id uuid;
  v_user_payroll_id uuid;
  v_company_payment_period_id uuid;
  v_has_loads boolean := false;
  v_has_fuel boolean := false;
  v_has_other_expenses boolean := false;
  v_has_other_income boolean := false;
  v_result jsonb;
BEGIN
  -- Obtener información de la expense_instance antes de eliminarla
  SELECT user_id, payment_period_id
  INTO v_user_id, v_payment_period_id
  FROM expense_instances
  WHERE id = expense_instance_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Expense instance not found'
    );
  END IF;

  -- Obtener el company_payment_period_id del user_payroll
  SELECT id, company_payment_period_id
  INTO v_user_payroll_id, v_company_payment_period_id
  FROM user_payrolls
  WHERE id = v_payment_period_id;

  -- Eliminar la expense_instance
  DELETE FROM expense_instances WHERE id = expense_instance_id;

  -- Verificar si el user_payroll quedó vacío
  IF v_user_payroll_id IS NOT NULL AND v_company_payment_period_id IS NOT NULL THEN
    
    -- Verificar si hay cargas
    SELECT EXISTS(
      SELECT 1 FROM loads 
      WHERE driver_user_id = v_user_id 
      AND payment_period_id = v_company_payment_period_id
      AND status != 'cancelled'
    ) INTO v_has_loads;

    -- Verificar si hay combustible
    SELECT EXISTS(
      SELECT 1 FROM fuel_expenses 
      WHERE driver_user_id = v_user_id 
      AND payment_period_id = v_company_payment_period_id
      AND status IN ('approved', 'pending')
    ) INTO v_has_fuel;

    -- Verificar si hay otras deducciones
    SELECT EXISTS(
      SELECT 1 FROM expense_instances 
      WHERE user_id = v_user_id 
      AND payment_period_id = v_user_payroll_id
    ) INTO v_has_other_expenses;

    -- Verificar si hay otros ingresos
    SELECT EXISTS(
      SELECT 1 FROM user_payrolls 
      WHERE id = v_user_payroll_id 
      AND other_income > 0
    ) INTO v_has_other_income;

    -- Si está completamente vacío, eliminar el user_payroll
    IF NOT (v_has_loads OR v_has_fuel OR v_has_other_expenses OR v_has_other_income) THEN
      DELETE FROM user_payrolls WHERE id = v_user_payroll_id;
      
      RAISE LOG 'delete_expense_instance_with_cleanup: Deleted empty user_payroll % for user %', 
        v_user_payroll_id, v_user_id;

      RETURN jsonb_build_object(
        'success', true,
        'message', 'Expense instance deleted and empty payroll cleaned up',
        'payroll_deleted', true,
        'user_payroll_id', v_user_payroll_id
      );
    ELSE
      -- Si no está vacío, recalcular el payroll
      BEGIN
        PERFORM calculate_user_payment_period_with_validation(v_user_payroll_id);
        
        RAISE LOG 'delete_expense_instance_with_cleanup: Recalculated user_payroll % for user %', 
          v_user_payroll_id, v_user_id;
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'delete_expense_instance_with_cleanup: Error recalculating payroll %: %', 
          v_user_payroll_id, SQLERRM;
      END;

      RETURN jsonb_build_object(
        'success', true,
        'message', 'Expense instance deleted and payroll recalculated',
        'payroll_deleted', false,
        'user_payroll_id', v_user_payroll_id
      );
    END IF;
  END IF;

  -- Si no había user_payroll asociado, solo devolver éxito
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Expense instance deleted',
    'payroll_deleted', false
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$function$;