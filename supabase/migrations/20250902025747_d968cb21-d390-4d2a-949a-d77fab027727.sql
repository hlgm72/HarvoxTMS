-- Fix simple_load_operation_with_deductions using UPSERT approach
CREATE OR REPLACE FUNCTION public.simple_load_operation_with_deductions(
  operation_type text,
  load_data jsonb,
  stops_data jsonb[] DEFAULT '{}'::jsonb[],
  load_id_param uuid DEFAULT NULL::uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  result_operation JSONB;
  result_load RECORD;
  load_pickup_date DATE;
  payment_period_id_result UUID;
  has_driver BOOLEAN := false;
  factoring_type_id UUID;
  dispatching_type_id UUID;
  leasing_type_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Get company_id from driver_user_id or current user
  IF (load_data->>'driver_user_id')::UUID IS NOT NULL THEN
    SELECT ucr.company_id INTO target_company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (load_data->>'driver_user_id')::UUID
    AND ucr.is_active = true
    LIMIT 1;
    
    has_driver := true;
  ELSE
    -- If no driver assigned, use current user's company
    SELECT ucr.company_id INTO target_company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = current_user_id
    AND ucr.is_active = true
    LIMIT 1;
  END IF;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_COMPANY_NOT_FOUND';
  END IF;

  -- Call the base load operation function
  SELECT simple_load_operation(
    operation_type,
    load_data,
    stops_data,
    load_id_param
  ) INTO result_operation;

  -- Extract the load from the result
  result_load := json_populate_record(null::loads, (result_operation->>'load')::json);

  -- Only process percentage deductions if we have a driver assigned
  IF has_driver AND (load_data->>'driver_user_id')::UUID IS NOT NULL THEN
    -- Get pickup date for payment period
    load_pickup_date := (load_data->>'pickup_date')::DATE;
    IF load_pickup_date IS NULL THEN
      load_pickup_date := result_load.pickup_date;
    END IF;

    -- Ensure payment period exists
    IF load_pickup_date IS NOT NULL THEN
      payment_period_id_result := create_payment_period_if_needed(target_company_id, load_pickup_date);
    END IF;

    -- Get the driver's period calculation
    SELECT dpc.id INTO payment_period_id_result
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE dpc.driver_user_id = (load_data->>'driver_user_id')::UUID
    AND cpp.company_id = target_company_id
    AND load_pickup_date >= cpp.period_start_date
    AND load_pickup_date <= cpp.period_end_date
    LIMIT 1;

    IF payment_period_id_result IS NOT NULL THEN
      -- Get expense type IDs
      SELECT id INTO factoring_type_id FROM expense_types WHERE name = 'Factoring Fee' AND category = 'percentage_deduction' LIMIT 1;
      SELECT id INTO dispatching_type_id FROM expense_types WHERE name = 'Dispatching Fee' AND category = 'percentage_deduction' LIMIT 1;
      SELECT id INTO leasing_type_id FROM expense_types WHERE name = 'Leasing Fee' AND category = 'percentage_deduction' LIMIT 1;

      -- Apply percentage deductions using UPSERT
      -- Factoring deduction
      IF COALESCE((load_data->>'factoring_percentage')::NUMERIC, 0) > 0 AND factoring_type_id IS NOT NULL THEN
        INSERT INTO expense_instances (
          payment_period_id,
          user_id,
          expense_type_id,
          amount,
          description,
          expense_date,
          status,
          created_by
        ) VALUES (
          payment_period_id_result,
          (load_data->>'driver_user_id')::UUID,
          factoring_type_id,
          (result_load.total_amount * (load_data->>'factoring_percentage')::NUMERIC / 100),
          'Factoring deduction for load ' || result_load.load_number,
          load_pickup_date,
          'applied',
          current_user_id
        )
        ON CONFLICT (payment_period_id, expense_type_id, user_id) 
        DO UPDATE SET
          amount = EXCLUDED.amount,
          description = EXCLUDED.description,
          expense_date = EXCLUDED.expense_date,
          updated_at = now();
      END IF;

      -- Dispatching deduction
      IF COALESCE((load_data->>'dispatching_percentage')::NUMERIC, 0) > 0 AND dispatching_type_id IS NOT NULL THEN
        INSERT INTO expense_instances (
          payment_period_id,
          user_id,
          expense_type_id,
          amount,
          description,
          expense_date,
          status,
          created_by
        ) VALUES (
          payment_period_id_result,
          (load_data->>'driver_user_id')::UUID,
          dispatching_type_id,
          (result_load.total_amount * (load_data->>'dispatching_percentage')::NUMERIC / 100),
          'Dispatching deduction for load ' || result_load.load_number,
          load_pickup_date,
          'applied',
          current_user_id
        )
        ON CONFLICT (payment_period_id, expense_type_id, user_id) 
        DO UPDATE SET
          amount = EXCLUDED.amount,
          description = EXCLUDED.description,
          expense_date = EXCLUDED.expense_date,
          updated_at = now();
      END IF;

      -- Leasing deduction
      IF COALESCE((load_data->>'leasing_percentage')::NUMERIC, 0) > 0 AND leasing_type_id IS NOT NULL THEN
        INSERT INTO expense_instances (
          payment_period_id,
          user_id,
          expense_type_id,
          amount,
          description,
          expense_date,
          status,
          created_by
        ) VALUES (
          payment_period_id_result,
          (load_data->>'driver_user_id')::UUID,
          leasing_type_id,
          (result_load.total_amount * (load_data->>'leasing_percentage')::NUMERIC / 100),
          'Leasing deduction for load ' || result_load.load_number,
          load_pickup_date,
          'applied',
          current_user_id
        )
        ON CONFLICT (payment_period_id, expense_type_id, user_id) 
        DO UPDATE SET
          amount = EXCLUDED.amount,
          description = EXCLUDED.description,
          expense_date = EXCLUDED.expense_date,
          updated_at = now();
      END IF;
    END IF;
  END IF;

  -- Return enhanced result
  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', CASE 
      WHEN operation_type = 'CREATE' THEN 'Carga creada exitosamente con deducciones aplicadas'
      ELSE 'Carga actualizada exitosamente con deducciones aplicadas'
    END,
    'load', row_to_json(result_load),
    'stops', result_operation->'stops',
    'deductions_applied', has_driver,
    'payment_period_id', payment_period_id_result,
    'processed_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación de carga con deducciones automáticas: %', SQLERRM;
END;
$function$;