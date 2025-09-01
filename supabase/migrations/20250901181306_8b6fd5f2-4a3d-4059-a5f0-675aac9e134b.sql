-- Fix the create_other_income_with_validation function to use correct calculation function
CREATE OR REPLACE FUNCTION public.create_other_income_with_validation(
  income_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_income RECORD;
  target_period_id UUID;
  driver_calculation_id UUID;
  company_id_found UUID;
  current_user_id UUID;
  target_date DATE;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- ================================
  -- 1. VALIDATE USER ACCESS
  -- ================================
  SELECT company_id INTO company_id_found
  FROM user_company_roles
  WHERE user_id = (income_data->>'user_id')::UUID
  AND is_active = true
  LIMIT 1;

  IF company_id_found IS NULL THEN
    RAISE EXCEPTION 'Usuario objetivo no encontrado en ninguna empresa';
  END IF;

  -- Verify current user has access to the company
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = company_id_found
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'No tienes acceso a la empresa del usuario objetivo';
  END IF;

  -- ================================
  -- 2. AUTO-ASSIGN PAYMENT PERIOD
  -- ================================
  target_date := (income_data->>'income_date')::DATE;
  
  -- Use the on-demand system instead of mass generation
  target_period_id := create_payment_period_if_needed(company_id_found, target_date);

  IF target_period_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo encontrar o generar un período de pago para la fecha %', target_date;
  END IF;

  -- Get the driver calculation ID
  SELECT id INTO driver_calculation_id
  FROM driver_period_calculations
  WHERE company_payment_period_id = target_period_id
  AND driver_user_id = (income_data->>'user_id')::UUID
  LIMIT 1;

  IF driver_calculation_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el cálculo del período para el conductor';
  END IF;

  -- ================================
  -- 3. CREATE OTHER INCOME RECORD
  -- ================================
  INSERT INTO other_income (
    user_id,
    payment_period_id,
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
    (income_data->>'user_id')::UUID,
    target_period_id,
    income_data->>'description',
    (income_data->>'amount')::NUMERIC,
    income_data->>'income_type',
    (income_data->>'income_date')::DATE,
    income_data->>'reference_number',
    income_data->>'notes',
    (income_data->>'applied_to_role')::user_role,
    COALESCE(income_data->>'status', 'pending'),
    current_user_id
  ) RETURNING * INTO result_income;

  -- ================================
  -- 4. UPDATE PAYMENT CALCULATIONS
  -- ================================
  PERFORM calculate_driver_payment_period_v2(driver_calculation_id);

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Otro ingreso creado exitosamente',
    'other_income', row_to_json(result_income),
    'payment_period_id', target_period_id,
    'created_by', current_user_id,
    'created_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error creando otro ingreso ACID: %', SQLERRM;
END;
$$;