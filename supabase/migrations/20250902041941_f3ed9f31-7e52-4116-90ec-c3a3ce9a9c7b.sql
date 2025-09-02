-- Fix the delete_load_with_validation function to handle RLS properly
CREATE OR REPLACE FUNCTION public.delete_load_with_validation(load_id_param UUID)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_user_id UUID;
  load_record RECORD;
  target_company_id UUID;
  result_data JSONB;
  driver_calculation_id UUID;
  factoring_expense_type_id UUID;
  dispatching_expense_type_id UUID;
  leasing_expense_type_id UUID;
  factoring_amount NUMERIC := 0;
  dispatching_amount NUMERIC := 0;
  leasing_amount NUMERIC := 0;
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
    -- Get company through payment period
    SELECT cpp.company_id INTO target_company_id
    FROM company_payment_periods cpp
    WHERE cpp.id = load_record.payment_period_id;
  ELSIF load_record.driver_user_id IS NOT NULL THEN
    -- Get company through driver's company roles
    SELECT DISTINCT ucr.company_id INTO target_company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = load_record.driver_user_id
    AND ucr.is_active = true
    LIMIT 1;
  ELSIF load_record.client_id IS NOT NULL THEN
    -- Get company through client
    SELECT cc.company_id INTO target_company_id
    FROM company_clients cc
    WHERE cc.id = load_record.client_id;
  ELSE
    -- Try to get company through the user who created the load
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
      -- Get driver period calculation ID using SECURITY DEFINER context
      SELECT dpc.id INTO driver_calculation_id
      FROM driver_period_calculations dpc
      JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
      WHERE dpc.driver_user_id = load_record.driver_user_id
      AND cpp.id = load_record.payment_period_id
      AND cpp.company_id = target_company_id; -- Ensure we only access this company's data

      IF driver_calculation_id IS NOT NULL THEN
        -- Get expense type IDs for percentage deductions
        SELECT id INTO factoring_expense_type_id 
        FROM expense_types 
        WHERE LOWER(name) LIKE '%factoring%' AND category = 'percentage_deduction' 
        LIMIT 1;
        
        SELECT id INTO dispatching_expense_type_id 
        FROM expense_types 
        WHERE LOWER(name) LIKE '%dispatch%' AND category = 'percentage_deduction' 
        LIMIT 1;
        
        SELECT id INTO leasing_expense_type_id 
        FROM expense_types 
        WHERE LOWER(name) LIKE '%leas%' AND category = 'percentage_deduction' 
        LIMIT 1;

        -- Calculate deduction amounts that need to be removed
        IF load_record.factoring_percentage > 0 THEN
          factoring_amount := (load_record.total_amount * load_record.factoring_percentage / 100);
        END IF;
        
        IF load_record.dispatching_percentage > 0 THEN
          dispatching_amount := (load_record.total_amount * load_record.dispatching_percentage / 100);
        END IF;
        
        IF load_record.leasing_percentage > 0 THEN
          leasing_amount := (load_record.total_amount * load_record.leasing_percentage / 100);
        END IF;

        -- Remove the specific expense instances created for this load
        DELETE FROM expense_instances 
        WHERE payment_period_id = driver_calculation_id 
        AND expense_type_id IN (
          SELECT id FROM expense_types 
          WHERE category = 'percentage_deduction'
        )
        AND description LIKE '%Load ' || load_record.load_number || '%';
      END IF;
    END IF;

    -- STEP 2: Delete related load stops
    DELETE FROM load_stops WHERE load_id = load_record.id;

    -- STEP 3: Delete load documents if any
    DELETE FROM load_documents WHERE load_id = load_record.id;

    -- STEP 4: Delete the main load record
    DELETE FROM loads WHERE id = load_record.id;

    -- STEP 5: Recalculate driver period totals if there was a driver assigned
    IF load_record.driver_user_id IS NOT NULL AND driver_calculation_id IS NOT NULL THEN
      -- Recalculate totals for the driver period
      WITH period_calculations AS (
        SELECT 
          -- Gross earnings from remaining loads
          COALESCE(SUM(l.total_amount), 0) as calculated_gross_earnings,
          -- Fuel expenses
          COALESCE(
            (SELECT SUM(fe.total_amount) 
             FROM fuel_expenses fe 
             WHERE fe.driver_user_id = load_record.driver_user_id 
             AND fe.payment_period_id = load_record.payment_period_id), 0
          ) as calculated_fuel_expenses,
          -- Total deductions
          COALESCE(
            (SELECT SUM(ei.amount) 
             FROM expense_instances ei 
             WHERE ei.payment_period_id = driver_calculation_id), 0
          ) as calculated_total_deductions
        FROM loads l
        WHERE l.driver_user_id = load_record.driver_user_id 
        AND l.payment_period_id = load_record.payment_period_id
      )
      UPDATE driver_period_calculations dpc
      SET 
        gross_earnings = pc.calculated_gross_earnings,
        fuel_expenses = pc.calculated_fuel_expenses,
        total_deductions = pc.calculated_total_deductions,
        total_income = pc.calculated_gross_earnings + dpc.other_income,
        net_payment = (pc.calculated_gross_earnings + dpc.other_income) - pc.calculated_fuel_expenses - pc.calculated_total_deductions,
        has_negative_balance = ((pc.calculated_gross_earnings + dpc.other_income) - pc.calculated_fuel_expenses - pc.calculated_total_deductions) < 0,
        updated_at = now()
      FROM period_calculations pc
      WHERE dpc.id = driver_calculation_id;
    END IF;

    -- Create result data
    result_data := jsonb_build_object(
      'success', true,
      'message', 'Carga eliminada exitosamente',
      'load_id', load_record.id,
      'load_number', load_record.load_number,
      'company_id', target_company_id,
      'driver_recalculated', driver_calculation_id IS NOT NULL,
      'deleted_by', current_user_id,
      'deleted_at', now()
    );

    RETURN result_data;

  EXCEPTION WHEN OTHERS THEN
    -- Rollback happens automatically, just re-raise with context
    RAISE EXCEPTION 'Error en eliminación ACID de carga: %', SQLERRM;
  END;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en eliminación ACID de carga: %', SQLERRM;
END;
$function$;