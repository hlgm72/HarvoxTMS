-- Fix delete_load_with_validation to properly delete expense_instances before deleting periods
CREATE OR REPLACE FUNCTION public.delete_load_with_validation(load_id_param uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  load_record RECORD;
  target_company_id UUID;
  result_data JSONB;
  driver_calculation_id UUID;
  factoring_amount NUMERIC := 0;
  dispatching_amount NUMERIC := 0;
  leasing_amount NUMERIC := 0;
  period_has_data BOOLEAN := FALSE;
  period_has_any_payrolls BOOLEAN := FALSE;
  payroll_deleted BOOLEAN := FALSE;
  period_deleted BOOLEAN := FALSE;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Error en eliminación ACID de carga: Usuario no autenticado';
  END IF;

  -- Get load record and verify it exists
  SELECT * INTO load_record
  FROM loads 
  WHERE id = load_id_param;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Error en eliminación ACID de carga: Carga no encontrada';
  END IF;

  -- Get company_id through payment_period or driver_user_id or client_id
  IF load_record.payment_period_id IS NOT NULL THEN
    SELECT cpp.company_id INTO target_company_id
    FROM company_payment_periods cpp
    WHERE cpp.id = load_record.payment_period_id;
  ELSIF load_record.driver_user_id IS NOT NULL THEN
    SELECT DISTINCT ucr.company_id INTO target_company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = load_record.driver_user_id
    AND ucr.is_active = true
    LIMIT 1;
  ELSIF load_record.client_id IS NOT NULL THEN
    SELECT cc.company_id INTO target_company_id
    FROM company_clients cc
    WHERE cc.id = load_record.client_id;
  ELSE
    SELECT DISTINCT ucr.company_id INTO target_company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = COALESCE(load_record.created_by, current_user_id)
    AND ucr.is_active = true
    LIMIT 1;
  END IF;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'Error en eliminación ACID de carga: No se pudo identificar la empresa de la carga';
  END IF;

  -- Verify user has permissions to delete this load
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = current_user_id
    AND ucr.company_id = target_company_id
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Error en eliminación ACID de carga: Sin permisos para eliminar esta carga';
  END IF;

  -- Start ACID transaction for deletion
  BEGIN
    -- STEP 1: Remove percentage deductions if driver is assigned and has percentages
    IF load_record.driver_user_id IS NOT NULL AND load_record.payment_period_id IS NOT NULL THEN
      driver_calculation_id := get_driver_period_calculation_secure(
        load_record.driver_user_id,
        load_record.payment_period_id,
        target_company_id
      );

      IF driver_calculation_id IS NOT NULL THEN
        IF load_record.factoring_percentage > 0 THEN
          factoring_amount := (load_record.total_amount * load_record.factoring_percentage / 100);
        END IF;
        
        IF load_record.dispatching_percentage > 0 THEN
          dispatching_amount := (load_record.total_amount * load_record.dispatching_percentage / 100);
        END IF;
        
        IF load_record.leasing_percentage > 0 THEN
          leasing_amount := (load_record.total_amount * load_record.leasing_percentage / 100);
        END IF;

        DELETE FROM expense_instances 
        WHERE payment_period_id = driver_calculation_id 
        AND expense_type_id IN (
          SELECT id FROM expense_types 
          WHERE category = 'percentage_deduction'
        )
        AND notes LIKE '%Load ' || load_record.load_number || '%';
      END IF;
    END IF;

    -- STEP 2: Delete related load stops
    DELETE FROM load_stops WHERE load_id = load_id_param;

    -- STEP 3: Delete the load itself
    DELETE FROM loads WHERE id = load_id_param;

    -- STEP 4: Check if period is now empty and should be deleted
    IF load_record.payment_period_id IS NOT NULL AND load_record.driver_user_id IS NOT NULL THEN
      -- Check if this driver's payroll in this period has any data left
      SELECT EXISTS (
        -- Check for other loads
        SELECT 1 FROM loads 
        WHERE driver_user_id = load_record.driver_user_id 
        AND payment_period_id = load_record.payment_period_id
        LIMIT 1
      ) OR EXISTS (
        -- Check for fuel expenses
        SELECT 1 FROM fuel_expenses 
        WHERE driver_user_id = load_record.driver_user_id 
        AND payment_period_id = driver_calculation_id
        LIMIT 1
      ) OR EXISTS (
        -- Check for other income
        SELECT 1 FROM other_income 
        WHERE user_id = load_record.driver_user_id 
        AND payment_period_id = driver_calculation_id
        LIMIT 1
      ) OR EXISTS (
        -- Check for expense instances (deductions)
        SELECT 1 FROM expense_instances 
        WHERE user_id = load_record.driver_user_id 
        AND payment_period_id = driver_calculation_id
        LIMIT 1
      ) INTO period_has_data;

      -- If driver's payroll has no data, delete it
      IF NOT period_has_data AND driver_calculation_id IS NOT NULL THEN
        -- FIXED: Delete all expense_instances for this driver in this period FIRST
        -- Note: payment_period_id in expense_instances references user_payrolls.id
        DELETE FROM expense_instances 
        WHERE user_id = load_record.driver_user_id 
        AND payment_period_id = driver_calculation_id;
        
        -- Now safe to delete the payroll
        DELETE FROM user_payrolls WHERE id = driver_calculation_id;
        payroll_deleted := TRUE;

        -- Now check if the company_payment_period has any other payrolls
        SELECT EXISTS (
          SELECT 1 FROM user_payrolls 
          WHERE company_payment_period_id = load_record.payment_period_id
          LIMIT 1
        ) INTO period_has_any_payrolls;

        -- If period has no payrolls left, check and delete
        IF NOT period_has_any_payrolls THEN
          -- FIXED: Delete all remaining expense_instances that reference this period
          -- Note: payment_period_id in expense_instances can ALSO reference company_payment_periods.id
          DELETE FROM expense_instances 
          WHERE payment_period_id = load_record.payment_period_id;
          
          -- Now safe to delete the period
          DELETE FROM company_payment_periods WHERE id = load_record.payment_period_id;
          period_deleted := TRUE;
        END IF;
      END IF;
    END IF;

    -- STEP 5: Return success result
    result_data := jsonb_build_object(
      'success', true,
      'message', 'Carga eliminada exitosamente',
      'load_id', load_id_param,
      'company_id', target_company_id,
      'payroll_deleted', payroll_deleted,
      'period_deleted', period_deleted,
      'deductions_removed', jsonb_build_object(
        'factoring_amount', factoring_amount,
        'dispatching_amount', dispatching_amount,
        'leasing_amount', leasing_amount
      ),
      'deleted_by', current_user_id,
      'deleted_at', now()
    );

  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error en eliminación ACID de carga: %', SQLERRM;
  END;

  RETURN result_data;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en eliminación ACID de carga: %', SQLERRM;
END;
$$;