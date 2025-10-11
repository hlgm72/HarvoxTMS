
-- Drop and recreate simple_load_operation_with_deductions function with correct logic
DROP FUNCTION IF EXISTS public.simple_load_operation_with_deductions(jsonb, jsonb, uuid) CASCADE;

CREATE OR REPLACE FUNCTION public.simple_load_operation_with_deductions(
  load_data jsonb,
  stops_data jsonb DEFAULT '[]'::jsonb,
  load_id_param uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_load_id uuid;
  v_result jsonb;
  v_driver_user_id uuid;
  v_company_id uuid;
  v_period_id uuid;
  v_pickup_date date;
  v_delivery_date date;
  v_total_amount numeric;
  v_stop record;
  v_is_update boolean;
BEGIN
  -- Determine if this is an update or create
  v_is_update := (load_id_param IS NOT NULL);
  
  -- Extract key values from load_data
  v_driver_user_id := (load_data->>'driver_user_id')::uuid;
  v_company_id := (SELECT company_id FROM user_company_roles WHERE user_id = auth.uid() AND is_active = true LIMIT 1);
  v_total_amount := (load_data->>'total_amount')::numeric;
  v_pickup_date := (load_data->>'pickup_date')::date;
  v_delivery_date := (load_data->>'delivery_date')::date;

  -- Validate company_id
  IF v_company_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No active company found for user'
    );
  END IF;

  -- Create or update the load
  IF v_is_update THEN
    -- Update existing load
    UPDATE loads
    SET
      load_number = load_data->>'load_number',
      po_number = load_data->>'po_number',
      driver_user_id = v_driver_user_id,
      internal_dispatcher_id = (load_data->>'internal_dispatcher_id')::uuid,
      client_id = (load_data->>'client_id')::uuid,
      client_contact_id = (load_data->>'client_contact_id')::uuid,
      total_amount = v_total_amount,
      commodity = load_data->>'commodity',
      weight_lbs = (load_data->>'weight_lbs')::numeric,
      notes = load_data->>'notes',
      customer_name = load_data->>'customer_name',
      factoring_percentage = COALESCE((load_data->>'factoring_percentage')::numeric, 0),
      dispatching_percentage = COALESCE((load_data->>'dispatching_percentage')::numeric, 0),
      leasing_percentage = COALESCE((load_data->>'leasing_percentage')::numeric, 0),
      pickup_date = v_pickup_date,
      delivery_date = v_delivery_date,
      updated_at = now()
    WHERE id = load_id_param
    AND company_id = v_company_id
    RETURNING id INTO v_load_id;

    IF v_load_id IS NULL THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Load not found or permission denied'
      );
    END IF;

    -- Delete existing stops for this load
    DELETE FROM load_stops WHERE load_id = v_load_id;
  ELSE
    -- Create new load
    INSERT INTO loads (
      company_id,
      load_number,
      po_number,
      driver_user_id,
      internal_dispatcher_id,
      client_id,
      client_contact_id,
      total_amount,
      commodity,
      weight_lbs,
      notes,
      customer_name,
      factoring_percentage,
      dispatching_percentage,
      leasing_percentage,
      pickup_date,
      delivery_date,
      status
    ) VALUES (
      v_company_id,
      load_data->>'load_number',
      load_data->>'po_number',
      v_driver_user_id,
      (load_data->>'internal_dispatcher_id')::uuid,
      (load_data->>'client_id')::uuid,
      (load_data->>'client_contact_id')::uuid,
      v_total_amount,
      load_data->>'commodity',
      (load_data->>'weight_lbs')::numeric,
      load_data->>'notes',
      load_data->>'customer_name',
      COALESCE((load_data->>'factoring_percentage')::numeric, 0),
      COALESCE((load_data->>'dispatching_percentage')::numeric, 0),
      COALESCE((load_data->>'leasing_percentage')::numeric, 0),
      v_pickup_date,
      v_delivery_date,
      'pending'
    )
    RETURNING id INTO v_load_id;
  END IF;

  -- Insert stops
  FOR v_stop IN SELECT * FROM jsonb_array_elements(stops_data)
  LOOP
    INSERT INTO load_stops (
      load_id,
      stop_number,
      stop_type,
      company_name,
      address,
      city,
      state,
      zip_code,
      reference_number,
      contact_name,
      contact_phone,
      special_instructions,
      scheduled_date,
      scheduled_time,
      actual_date
    ) VALUES (
      v_load_id,
      (v_stop.value->>'stop_number')::integer,
      v_stop.value->>'stop_type',
      v_stop.value->>'company_name',
      v_stop.value->>'address',
      v_stop.value->>'city',
      v_stop.value->>'state',
      v_stop.value->>'zip_code',
      v_stop.value->>'reference_number',
      v_stop.value->>'contact_name',
      v_stop.value->>'contact_phone',
      v_stop.value->>'special_instructions',
      (v_stop.value->>'scheduled_date')::date,
      (v_stop.value->>'scheduled_time')::time,
      (v_stop.value->>'actual_date')::date
    );
  END LOOP;

  -- Create payment period if driver is assigned
  IF v_driver_user_id IS NOT NULL AND v_delivery_date IS NOT NULL THEN
    -- Get or create payment period
    SELECT id INTO v_period_id
    FROM payment_periods
    WHERE company_id = v_company_id
    AND v_delivery_date BETWEEN start_date AND end_date
    AND status = 'open'
    LIMIT 1;

    IF v_period_id IS NULL THEN
      -- Create new payment period
      INSERT INTO payment_periods (
        company_id,
        start_date,
        end_date,
        status
      )
      SELECT
        v_company_id,
        date_trunc('week', v_delivery_date)::date,
        (date_trunc('week', v_delivery_date) + interval '6 days')::date,
        'open'
      RETURNING id INTO v_period_id;
    END IF;

    -- Create user_payment_period if it doesn't exist
    INSERT INTO user_payment_periods (
      user_id,
      payment_period_id,
      company_id,
      status
    )
    VALUES (
      v_driver_user_id,
      v_period_id,
      v_company_id,
      'open'
    )
    ON CONFLICT (user_id, payment_period_id) DO NOTHING;

    -- Generate automatic deductions
    INSERT INTO eventual_deductions (
      user_payment_period_id,
      deduction_type_id,
      amount,
      description,
      load_id,
      created_by
    )
    SELECT
      upp.id,
      dt.id,
      CASE
        WHEN dt.calculation_method = 'percentage' THEN (v_total_amount * dt.default_amount / 100)
        ELSE dt.default_amount
      END,
      dt.name || ' for load ' || load_data->>'load_number',
      v_load_id,
      auth.uid()
    FROM user_payment_periods upp
    CROSS JOIN deduction_types dt
    WHERE upp.user_id = v_driver_user_id
    AND upp.payment_period_id = v_period_id
    AND dt.company_id = v_company_id
    AND dt.is_active = true
    AND dt.apply_automatically = true;
  END IF;

  -- Build success response
  v_result := jsonb_build_object(
    'success', true,
    'load', jsonb_build_object(
      'id', v_load_id
    )
  );

  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.simple_load_operation_with_deductions(jsonb, jsonb, uuid) TO authenticated;
