-- Crear una función con SECURITY DEFINER que pueda insertar deducciones por porcentaje
CREATE OR REPLACE FUNCTION create_percentage_deduction_safe(
  p_user_id UUID,
  p_expense_type_id UUID,
  p_amount NUMERIC,
  p_expense_date DATE,
  p_description TEXT,
  p_payment_period_id UUID
) RETURNS UUID
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  new_expense_id UUID;
BEGIN
  -- Insertar la deducción con privilegios de superusuario
  INSERT INTO expense_instances (
    user_id,
    expense_type_id,
    amount,
    expense_date,
    description,
    status,
    payment_period_id,
    created_by,
    applied_at,
    applied_by
  ) VALUES (
    p_user_id,
    p_expense_type_id,
    p_amount,
    p_expense_date,
    p_description,
    'applied',
    p_payment_period_id,
    p_user_id, -- Usar el user_id del conductor como created_by
    now(),
    p_user_id  -- Usar el user_id del conductor como applied_by
  ) RETURNING id INTO new_expense_id;
  
  RETURN new_expense_id;
END;
$$;

-- Actualizar la función de generación para usar la función segura
CREATE OR REPLACE FUNCTION generate_deductions_for_existing_loads_safe()
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  load_record RECORD;
  processed_count INTEGER := 0;
  error_count INTEGER := 0;
  deductions_created INTEGER := 0;
  total_dispatching NUMERIC := 0;
  total_factoring NUMERIC := 0;
  total_leasing NUMERIC := 0;
BEGIN
  FOR load_record IN 
    SELECT l.* FROM loads l
    WHERE l.created_at >= '2025-08-25'
      AND l.created_at <= '2025-08-31 23:59:59'
      AND l.driver_user_id IS NOT NULL
      AND l.total_amount > 0
  LOOP
    BEGIN
      DECLARE
        owner_op_record RECORD;
        target_company_id UUID;
        dispatching_amount NUMERIC;
        factoring_amount NUMERIC;
        leasing_amount NUMERIC;
        period_id UUID;
        calculation_id UUID;
        dispatching_type_id UUID := '9e5a38ae-8851-4a8c-9bc7-11ac32cb7b10';
        factoring_type_id UUID := '1a3355f5-1a3b-49d6-89b4-acc7f259ebdb';
        leasing_type_id UUID := '28d59af7-c756-40bf-885e-fb995a744003';
        new_expense_id UUID;
      BEGIN
        -- Obtener company_id del conductor
        SELECT company_id INTO target_company_id
        FROM user_company_roles 
        WHERE user_id = load_record.driver_user_id AND is_active = true
        LIMIT 1;
        
        -- Obtener datos del owner operator  
        SELECT dispatching_percentage, factoring_percentage, leasing_percentage
        INTO owner_op_record
        FROM owner_operators 
        WHERE user_id = load_record.driver_user_id AND is_active = true
        LIMIT 1;
        
        -- Si no hay owner operator, usar los porcentajes de la carga
        IF NOT FOUND THEN
          owner_op_record.dispatching_percentage := load_record.dispatching_percentage;
          owner_op_record.factoring_percentage := load_record.factoring_percentage;
          owner_op_record.leasing_percentage := load_record.leasing_percentage;
        END IF;
        
        -- Asegurar período de pago
        SELECT create_payment_period_if_needed(target_company_id, load_record.created_at::DATE) INTO period_id;
        
        -- Obtener calculation_id
        SELECT dpc.id INTO calculation_id
        FROM driver_period_calculations dpc 
        JOIN company_payment_periods cpp ON cpp.id = dpc.company_payment_period_id
        WHERE dpc.driver_user_id = load_record.driver_user_id 
          AND cpp.id = period_id 
        LIMIT 1;
        
        -- Calcular montos
        dispatching_amount := ROUND(load_record.total_amount * COALESCE(owner_op_record.dispatching_percentage, 0) / 100, 2);
        factoring_amount := ROUND(load_record.total_amount * COALESCE(owner_op_record.factoring_percentage, 0) / 100, 2);
        leasing_amount := ROUND(load_record.total_amount * COALESCE(owner_op_record.leasing_percentage, 0) / 100, 2);
        
        -- Crear deducciones usando la función segura
        IF dispatching_amount > 0 AND calculation_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM expense_instances ei
          WHERE ei.user_id = load_record.driver_user_id
            AND ei.expense_type_id = dispatching_type_id
            AND ei.expense_date = load_record.created_at::DATE
            AND ABS(ei.amount - dispatching_amount) < 0.01
        ) THEN
          SELECT create_percentage_deduction_safe(
            load_record.driver_user_id,
            dispatching_type_id,
            dispatching_amount,
            load_record.created_at::DATE,
            'Dispatching fee for load #' || load_record.load_number || ' ($' || load_record.total_amount || ' × ' || COALESCE(owner_op_record.dispatching_percentage, 0) || '%)',
            calculation_id
          ) INTO new_expense_id;
          
          IF new_expense_id IS NOT NULL THEN
            total_dispatching := total_dispatching + dispatching_amount;
            deductions_created := deductions_created + 1;
          END IF;
        END IF;
        
        IF factoring_amount > 0 AND calculation_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM expense_instances ei
          WHERE ei.user_id = load_record.driver_user_id
            AND ei.expense_type_id = factoring_type_id
            AND ei.expense_date = load_record.created_at::DATE
            AND ABS(ei.amount - factoring_amount) < 0.01
        ) THEN
          SELECT create_percentage_deduction_safe(
            load_record.driver_user_id,
            factoring_type_id,
            factoring_amount,
            load_record.created_at::DATE,
            'Factoring fee for load #' || load_record.load_number || ' ($' || load_record.total_amount || ' × ' || COALESCE(owner_op_record.factoring_percentage, 0) || '%)',
            calculation_id
          ) INTO new_expense_id;
          
          IF new_expense_id IS NOT NULL THEN
            total_factoring := total_factoring + factoring_amount;
            deductions_created := deductions_created + 1;
          END IF;
        END IF;
        
        IF leasing_amount > 0 AND calculation_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM expense_instances ei
          WHERE ei.user_id = load_record.driver_user_id
            AND ei.expense_type_id = leasing_type_id
            AND ei.expense_date = load_record.created_at::DATE
            AND ABS(ei.amount - leasing_amount) < 0.01
        ) THEN
          SELECT create_percentage_deduction_safe(
            load_record.driver_user_id,
            leasing_type_id,
            leasing_amount,
            load_record.created_at::DATE,
            'Leasing fee for load #' || load_record.load_number || ' ($' || load_record.total_amount || ' × ' || COALESCE(owner_op_record.leasing_percentage, 0) || '%)',
            calculation_id
          ) INTO new_expense_id;
          
          IF new_expense_id IS NOT NULL THEN
            total_leasing := total_leasing + leasing_amount;
            deductions_created := deductions_created + 1;
          END IF;
        END IF;
        
        processed_count := processed_count + 1;
      END;
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE NOTICE 'Error processing load %: %', load_record.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'processed_loads', processed_count,
    'error_loads', error_count,
    'deductions_created', deductions_created,
    'total_dispatching_generated', total_dispatching,
    'total_factoring_generated', total_factoring,
    'total_leasing_generated', total_leasing,
    'message', 'Percentage deductions generated safely for existing loads'
  );
END;
$$;