-- ========================================
-- ACID Implementation for Driver Payment Actions
-- ========================================

-- Function to calculate driver payment period with ACID guarantees
CREATE OR REPLACE FUNCTION public.calculate_driver_payment_period_with_validation(
  period_calculation_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calculation_record RECORD;
  loads_total NUMERIC := 0;
  fuel_total NUMERIC := 0;
  deductions_total NUMERIC := 0;
  other_income_total NUMERIC := 0;
  total_income NUMERIC := 0;
  net_payment NUMERIC := 0;
  has_negative BOOLEAN := false;
  current_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get the calculation record with permission validation
  SELECT dpc.*, cpp.company_id, cpp.period_start_date, cpp.period_end_date
  INTO calculation_record
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
  WHERE dpc.id = period_calculation_id
  AND ucr.user_id = current_user_id
  AND ucr.is_active = true
  AND ucr.role IN ('company_owner', 'operations_manager', 'dispatcher', 'superadmin');
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cálculo no encontrado o sin permisos para acceder';
  END IF;

  -- Start atomic calculation process
  
  -- ================================
  -- 1. CALCULATE LOADS TOTAL
  -- ================================
  SELECT COALESCE(SUM(total_amount), 0) INTO loads_total
  FROM loads l
  WHERE l.driver_user_id = calculation_record.driver_user_id
  AND l.payment_period_id = calculation_record.company_payment_period_id
  AND l.status = 'completed';
  
  -- ================================
  -- 2. CALCULATE FUEL EXPENSES TOTAL
  -- ================================
  SELECT COALESCE(SUM(total_amount), 0) INTO fuel_total
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calculation_record.driver_user_id
  AND fe.payment_period_id = period_calculation_id;
  
  -- ================================
  -- 3. CALCULATE DEDUCTIONS TOTAL
  -- ================================
  SELECT COALESCE(SUM(amount), 0) INTO deductions_total
  FROM expense_instances ei
  WHERE ei.user_id = calculation_record.driver_user_id
  AND ei.payment_period_id = period_calculation_id
  AND ei.status = 'applied';
  
  -- ================================
  -- 4. CALCULATE OTHER INCOME TOTAL
  -- ================================
  SELECT COALESCE(SUM(amount), 0) INTO other_income_total
  FROM other_income oi
  WHERE oi.user_id = calculation_record.driver_user_id
  AND oi.payment_period_id = period_calculation_id
  AND oi.status = 'approved';
  
  -- ================================
  -- 5. GENERATE PERCENTAGE DEDUCTIONS
  -- ================================
  PERFORM generate_load_percentage_deductions(NULL, period_calculation_id);
  
  -- Recalculate deductions after percentage deductions
  SELECT COALESCE(SUM(amount), 0) INTO deductions_total
  FROM expense_instances ei
  WHERE ei.user_id = calculation_record.driver_user_id
  AND ei.payment_period_id = period_calculation_id
  AND ei.status = 'applied';
  
  -- ================================
  -- 6. CALCULATE FINAL TOTALS
  -- ================================
  total_income := loads_total + other_income_total;
  net_payment := total_income - fuel_total - deductions_total;
  has_negative := net_payment < 0;
  
  -- ================================
  -- 7. UPDATE CALCULATION RECORD ATOMICALLY
  -- ================================
  UPDATE driver_period_calculations
  SET 
    gross_earnings = loads_total,
    fuel_expenses = fuel_total,
    total_deductions = deductions_total,
    other_income = other_income_total,
    total_income = total_income,
    net_payment = net_payment,
    has_negative_balance = has_negative,
    payment_status = CASE 
      WHEN has_negative THEN 'needs_review'
      ELSE 'calculated'
    END,
    calculated_at = now(),
    calculated_by = current_user_id,
    updated_at = now()
  WHERE id = period_calculation_id;
  
  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Período calculado exitosamente con garantías ACID',
    'calculation_id', period_calculation_id,
    'gross_earnings', loads_total,
    'fuel_expenses', fuel_total,
    'total_deductions', deductions_total,
    'other_income', other_income_total,
    'total_income', total_income,
    'net_payment', net_payment,
    'has_negative_balance', has_negative,
    'calculated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  RAISE EXCEPTION 'Error en cálculo ACID del período: %', SQLERRM;
END;
$$;

-- Function to mark multiple drivers as paid with ACID guarantees
CREATE OR REPLACE FUNCTION public.mark_multiple_drivers_as_paid_with_validation(
  calculation_ids UUID[],
  payment_method_used TEXT,
  payment_ref TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  calculation_id UUID;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  current_user_id UUID;
  payment_results JSONB := '[]'::jsonb;
  calc_result JSONB;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Start atomic bulk payment process
  
  -- Loop through each calculation ID
  FOREACH calculation_id IN ARRAY calculation_ids
  LOOP
    BEGIN
      -- Use existing mark_driver_as_paid function for individual payments
      SELECT mark_driver_as_paid(
        calculation_id,
        payment_method_used,
        payment_ref,
        notes
      ) INTO calc_result;
      
      IF (calc_result->>'success')::BOOLEAN THEN
        success_count := success_count + 1;
        payment_results := payment_results || jsonb_build_object(
          'calculation_id', calculation_id,
          'success', true,
          'message', calc_result->>'message'
        );
      ELSE
        error_count := error_count + 1;
        payment_results := payment_results || jsonb_build_object(
          'calculation_id', calculation_id,
          'success', false,
          'error', calc_result->>'message'
        );
      END IF;
      
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      payment_results := payment_results || jsonb_build_object(
        'calculation_id', calculation_id,
        'success', false,
        'error', SQLERRM
      );
    END;
  END LOOP;
  
  -- Return comprehensive result
  RETURN jsonb_build_object(
    'success', success_count > 0,
    'message', format('Procesados %s pagos: %s exitosos, %s fallidos', 
                     array_length(calculation_ids, 1), success_count, error_count),
    'success_count', success_count,
    'error_count', error_count,
    'total_processed', array_length(calculation_ids, 1),
    'payment_method', payment_method_used,
    'payment_reference', payment_ref,
    'processed_by', current_user_id,
    'processed_at', now(),
    'detailed_results', payment_results
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  RAISE EXCEPTION 'Error en pago masivo ACID: %', SQLERRM;
END;
$$;

-- ========================================
-- ACID Implementation for Other Income Operations
-- ========================================

-- Function to create other income with ACID guarantees
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
  company_id_found UUID;
  current_user_id UUID;
  target_date DATE;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Start atomic transaction
  
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
  
  -- Try to find existing period
  SELECT id INTO target_period_id
  FROM company_payment_periods
  WHERE company_id = company_id_found
  AND period_start_date <= target_date
  AND period_end_date >= target_date
  AND status IN ('open', 'processing')
  LIMIT 1;

  -- If no period found, generate one
  IF target_period_id IS NULL THEN
    PERFORM generate_company_payment_periods_with_calculations(
      company_id_found,
      target_date - INTERVAL '30 days',
      target_date + INTERVAL '30 days',
      true
    );

    -- Try to find period again
    SELECT id INTO target_period_id
    FROM company_payment_periods
    WHERE company_id = company_id_found
    AND period_start_date <= target_date
    AND period_end_date >= target_date
    AND status IN ('open', 'processing')
    LIMIT 1;
  END IF;

  IF target_period_id IS NULL THEN
    RAISE EXCEPTION 'No se pudo encontrar o generar un período de pago para la fecha %', target_date;
  END IF;

  -- Get the driver's calculation period ID
  DECLARE
    calculation_period_id UUID;
  BEGIN
    SELECT id INTO calculation_period_id
    FROM driver_period_calculations
    WHERE company_payment_period_id = target_period_id
    AND driver_user_id = (income_data->>'user_id')::UUID
    LIMIT 1;

    IF calculation_period_id IS NULL THEN
      RAISE EXCEPTION 'No se encontró el cálculo del período para el conductor';
    END IF;
  END;

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
    calculation_period_id,
    income_data->>'description',
    (income_data->>'amount')::NUMERIC,
    income_data->>'income_type',
    target_date,
    NULLIF(income_data->>'reference_number', ''),
    NULLIF(income_data->>'notes', ''),
    (income_data->>'applied_to_role')::user_role,
    COALESCE(income_data->>'status', 'approved'),
    current_user_id
  ) RETURNING * INTO result_income;

  -- ================================
  -- 4. TRIGGER AUTOMATIC RECALCULATION
  -- ================================
  PERFORM recalculate_payment_period_totals(calculation_period_id);

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Otro ingreso creado exitosamente con garantías ACID',
    'income', row_to_json(result_income),
    'payment_period_assigned', target_period_id,
    'calculation_period_id', calculation_period_id,
    'auto_recalculated', true,
    'created_by', current_user_id,
    'created_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  RAISE EXCEPTION 'Error creando otro ingreso ACID: %', SQLERRM;
END;
$$;

-- Function to update other income with ACID guarantees
CREATE OR REPLACE FUNCTION public.update_other_income_with_validation(
  income_id UUID,
  income_data JSONB
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result_income RECORD;
  old_period_id UUID;
  new_period_id UUID;
  current_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Start atomic transaction
  
  -- ================================
  -- 1. VALIDATE ACCESS AND GET OLD DATA
  -- ================================
  SELECT oi.payment_period_id INTO old_period_id
  FROM other_income oi
  JOIN driver_period_calculations dpc ON oi.payment_period_id = dpc.id
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
  WHERE oi.id = income_id
  AND ucr.user_id = current_user_id
  AND ucr.is_active = true;
  
  IF old_period_id IS NULL THEN
    RAISE EXCEPTION 'Ingreso no encontrado o sin permisos para modificar';
  END IF;

  -- ================================
  -- 2. UPDATE OTHER INCOME RECORD
  -- ================================
  UPDATE other_income SET
    description = COALESCE(income_data->>'description', description),
    amount = COALESCE((income_data->>'amount')::NUMERIC, amount),
    income_type = COALESCE(income_data->>'income_type', income_type),
    income_date = COALESCE((income_data->>'income_date')::DATE, income_date),
    reference_number = COALESCE(NULLIF(income_data->>'reference_number', ''), reference_number),
    notes = COALESCE(NULLIF(income_data->>'notes', ''), notes),
    status = COALESCE(income_data->>'status', status),
    updated_at = now()
  WHERE id = income_id
  RETURNING * INTO result_income;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se pudo actualizar el ingreso';
  END IF;

  -- ================================
  -- 3. TRIGGER AUTOMATIC RECALCULATION
  -- ================================
  new_period_id := result_income.payment_period_id;
  
  -- Recalculate the affected period
  PERFORM recalculate_payment_period_totals(new_period_id);
  
  -- If period changed, recalculate old period too
  IF old_period_id != new_period_id THEN
    PERFORM recalculate_payment_period_totals(old_period_id);
  END IF;

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Otro ingreso actualizado exitosamente con garantías ACID',
    'income', row_to_json(result_income),
    'old_period_recalculated', old_period_id != new_period_id,
    'periods_recalculated', CASE 
      WHEN old_period_id != new_period_id THEN 2 
      ELSE 1 
    END,
    'updated_by', current_user_id,
    'updated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  RAISE EXCEPTION 'Error actualizando otro ingreso ACID: %', SQLERRM;
END;
$$;

-- Function to delete other income with ACID guarantees
CREATE OR REPLACE FUNCTION public.delete_other_income_with_validation(
  income_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  income_record RECORD;
  current_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Start atomic transaction
  
  -- ================================
  -- 1. VALIDATE ACCESS AND GET DATA
  -- ================================
  SELECT oi.*, dpc.id as calculation_period_id
  INTO income_record
  FROM other_income oi
  JOIN driver_period_calculations dpc ON oi.payment_period_id = dpc.id
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
  WHERE oi.id = income_id
  AND ucr.user_id = current_user_id
  AND ucr.is_active = true;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ingreso no encontrado o sin permisos para eliminar';
  END IF;

  -- ================================
  -- 2. DELETE OTHER INCOME RECORD
  -- ================================
  DELETE FROM other_income WHERE id = income_id;

  -- ================================
  -- 3. TRIGGER AUTOMATIC RECALCULATION
  -- ================================
  PERFORM recalculate_payment_period_totals(income_record.calculation_period_id);

  -- Return success result
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Otro ingreso eliminado exitosamente con garantías ACID',
    'deleted_income_id', income_id,
    'deleted_amount', income_record.amount,
    'period_recalculated', income_record.calculation_period_id,
    'deleted_by', current_user_id,
    'deleted_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  -- Automatic rollback on any error
  RAISE EXCEPTION 'Error eliminando otro ingreso ACID: %', SQLERRM;
END;
$$;