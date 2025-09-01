-- Arreglar el trigger para usar la estructura correcta de loads
CREATE OR REPLACE FUNCTION auto_generate_percentage_deductions()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  owner_op_record RECORD;
  dispatching_amount NUMERIC;
  factoring_amount NUMERIC;
  leasing_amount NUMERIC;
  target_company_id UUID;
  period_id UUID;
  calculation_id UUID;
  dispatching_type_id UUID;
  factoring_type_id UUID;
  leasing_type_id UUID;
BEGIN
  -- Solo procesar para cargas nuevas con conductor asignado
  IF TG_OP = 'INSERT' AND NEW.driver_user_id IS NOT NULL AND NEW.total_amount > 0 THEN
    
    -- Obtener company_id del conductor
    SELECT company_id INTO target_company_id
    FROM user_company_roles 
    WHERE user_id = NEW.driver_user_id AND is_active = true
    LIMIT 1;
    
    IF target_company_id IS NULL THEN
      RETURN NEW;
    END IF;
    
    -- Obtener datos del owner operator  
    SELECT dispatching_percentage, factoring_percentage, leasing_percentage
    INTO owner_op_record
    FROM owner_operators 
    WHERE user_id = NEW.driver_user_id AND is_active = true
    LIMIT 1;
    
    -- Si no hay owner operator, usar los porcentajes de la carga directamente
    IF NOT FOUND THEN
      owner_op_record.dispatching_percentage := NEW.dispatching_percentage;
      owner_op_record.factoring_percentage := NEW.factoring_percentage;
      owner_op_record.leasing_percentage := NEW.leasing_percentage;
    END IF;
    
    -- Obtener IDs de tipos de gastos
    SELECT id INTO dispatching_type_id FROM expense_types WHERE name = 'Dispatching Fee' LIMIT 1;
    SELECT id INTO factoring_type_id FROM expense_types WHERE name = 'Factoring Fee' LIMIT 1;
    SELECT id INTO leasing_type_id FROM expense_types WHERE name = 'Leasing Fee' LIMIT 1;
    
    -- Asegurar que existe un período de pago para esta fecha
    SELECT create_payment_period_if_needed(target_company_id, NEW.created_at::DATE) INTO period_id;
    
    -- Obtener el calculation_id del driver para este período
    SELECT dpc.id INTO calculation_id
    FROM driver_period_calculations dpc 
    JOIN company_payment_periods cpp ON cpp.id = dpc.company_payment_period_id
    WHERE dpc.driver_user_id = NEW.driver_user_id 
      AND cpp.id = period_id 
    LIMIT 1;
    
    -- Calcular montos
    dispatching_amount := ROUND(NEW.total_amount * COALESCE(owner_op_record.dispatching_percentage, 0) / 100, 2);
    factoring_amount := ROUND(NEW.total_amount * COALESCE(owner_op_record.factoring_percentage, 0) / 100, 2);
    leasing_amount := ROUND(NEW.total_amount * COALESCE(owner_op_record.leasing_percentage, 0) / 100, 2);
    
    -- Crear deducción por dispatching si aplica
    IF dispatching_amount > 0 AND dispatching_type_id IS NOT NULL THEN
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
        NEW.driver_user_id,
        dispatching_type_id,
        dispatching_amount,
        NEW.created_at::DATE,
        'Dispatching fee for load #' || NEW.load_number || ' ($' || NEW.total_amount || ' × ' || COALESCE(owner_op_record.dispatching_percentage, 0) || '%)',
        'applied',
        calculation_id,
        COALESCE(auth.uid(), NEW.created_by),
        now(),
        COALESCE(auth.uid(), NEW.created_by)
      );
    END IF;
    
    -- Crear deducción por factoring si aplica
    IF factoring_amount > 0 AND factoring_type_id IS NOT NULL THEN
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
        NEW.driver_user_id,
        factoring_type_id,
        factoring_amount,
        NEW.created_at::DATE,
        'Factoring fee for load #' || NEW.load_number || ' ($' || NEW.total_amount || ' × ' || COALESCE(owner_op_record.factoring_percentage, 0) || '%)',
        'applied',
        calculation_id,
        COALESCE(auth.uid(), NEW.created_by),
        now(),
        COALESCE(auth.uid(), NEW.created_by)
      );
    END IF;
    
    -- Crear deducción por leasing si aplica
    IF leasing_amount > 0 AND leasing_type_id IS NOT NULL THEN
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
        NEW.driver_user_id,
        leasing_type_id,
        leasing_amount,
        NEW.created_at::DATE,
        'Leasing fee for load #' || NEW.load_number || ' ($' || NEW.total_amount || ' × ' || COALESCE(owner_op_record.leasing_percentage, 0) || '%)',
        'applied',
        calculation_id,
        COALESCE(auth.uid(), NEW.created_by),
        now(),
        COALESCE(auth.uid(), NEW.created_by)
      );
    END IF;
    
    -- Log de la operación
    RAISE NOTICE 'Generated percentage deductions for load %: Dispatching $%, Factoring $%, Leasing $%', 
      NEW.id, dispatching_amount, factoring_amount, leasing_amount;
    
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear un trigger de prueba para las cargas existentes
CREATE OR REPLACE FUNCTION generate_deductions_for_existing_loads()
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  load_record RECORD;
  processed_count INTEGER := 0;
  error_count INTEGER := 0;
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
      -- Ejecutar lógica similar al trigger pero manual
      DECLARE
        owner_op_record RECORD;
        target_company_id UUID;
        dispatching_amount NUMERIC;
        factoring_amount NUMERIC;
        leasing_amount NUMERIC;
        period_id UUID;
        calculation_id UUID;
        dispatching_type_id UUID;
        factoring_type_id UUID;
        leasing_type_id UUID;
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
        
        -- Obtener IDs de tipos de gastos
        SELECT id INTO dispatching_type_id FROM expense_types WHERE name = 'Dispatching Fee' LIMIT 1;
        SELECT id INTO factoring_type_id FROM expense_types WHERE name = 'Factoring Fee' LIMIT 1;
        SELECT id INTO leasing_type_id FROM expense_types WHERE name = 'Leasing Fee' LIMIT 1;
        
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
        
        -- Solo crear si no existen ya
        IF dispatching_amount > 0 AND dispatching_type_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM expense_instances ei
          WHERE ei.user_id = load_record.driver_user_id
            AND ei.expense_type_id = dispatching_type_id
            AND ei.expense_date = load_record.created_at::DATE
            AND ei.amount = dispatching_amount
        ) THEN
          INSERT INTO expense_instances (
            user_id, expense_type_id, amount, expense_date, description, status, payment_period_id
          ) VALUES (
            load_record.driver_user_id, dispatching_type_id, dispatching_amount, load_record.created_at::DATE,
            'Dispatching fee for load #' || load_record.load_number, 'applied', calculation_id
          );
          total_dispatching := total_dispatching + dispatching_amount;
        END IF;
        
        IF factoring_amount > 0 AND factoring_type_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM expense_instances ei
          WHERE ei.user_id = load_record.driver_user_id
            AND ei.expense_type_id = factoring_type_id
            AND ei.expense_date = load_record.created_at::DATE
            AND ei.amount = factoring_amount
        ) THEN
          INSERT INTO expense_instances (
            user_id, expense_type_id, amount, expense_date, description, status, payment_period_id
          ) VALUES (
            load_record.driver_user_id, factoring_type_id, factoring_amount, load_record.created_at::DATE,
            'Factoring fee for load #' || load_record.load_number, 'applied', calculation_id
          );
          total_factoring := total_factoring + factoring_amount;
        END IF;
        
        IF leasing_amount > 0 AND leasing_type_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM expense_instances ei
          WHERE ei.user_id = load_record.driver_user_id
            AND ei.expense_type_id = leasing_type_id
            AND ei.expense_date = load_record.created_at::DATE
            AND ei.amount = leasing_amount
        ) THEN
          INSERT INTO expense_instances (
            user_id, expense_type_id, amount, expense_date, description, status, payment_period_id
          ) VALUES (
            load_record.driver_user_id, leasing_type_id, leasing_amount, load_record.created_at::DATE,
            'Leasing fee for load #' || load_record.load_number, 'applied', calculation_id
          );
          total_leasing := total_leasing + leasing_amount;
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
    'total_dispatching_generated', total_dispatching,
    'total_factoring_generated', total_factoring,
    'total_leasing_generated', total_leasing,
    'message', 'Percentage deductions generated for existing loads'
  );
END;
$$;