-- Arreglar warnings de seguridad: añadir search_path a las funciones

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
  period_id UUID;
  dispatching_type_id UUID;
  factoring_type_id UUID;
  leasing_type_id UUID;
BEGIN
  -- Solo procesar para cargas nuevas con conductor asignado
  IF TG_OP = 'INSERT' AND NEW.driver_user_id IS NOT NULL AND NEW.total_amount > 0 THEN
    
    -- Obtener datos del owner operator
    SELECT dispatching_percentage, factoring_percentage, leasing_percentage
    INTO owner_op_record
    FROM owner_operators 
    WHERE user_id = NEW.driver_user_id AND is_active = true
    LIMIT 1;
    
    -- Si no hay owner operator, no generar deducciones
    IF NOT FOUND THEN
      RETURN NEW;
    END IF;
    
    -- Obtener IDs de tipos de gastos
    SELECT id INTO dispatching_type_id FROM expense_types WHERE name = 'Dispatching Fee' LIMIT 1;
    SELECT id INTO factoring_type_id FROM expense_types WHERE name = 'Factoring Fee' LIMIT 1;
    SELECT id INTO leasing_type_id FROM expense_types WHERE name = 'Leasing Fee' LIMIT 1;
    
    -- Asegurar que existe un período de pago para esta fecha
    SELECT create_payment_period_if_needed(NEW.company_id, NEW.created_at::DATE) INTO period_id;
    
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
        'Dispatching fee for load #' || NEW.load_number || ' ($' || NEW.total_amount || ' × ' || owner_op_record.dispatching_percentage || '%)',
        'applied',
        (SELECT dpc.id FROM driver_period_calculations dpc 
         JOIN company_payment_periods cpp ON cpp.id = dpc.company_payment_period_id
         WHERE dpc.driver_user_id = NEW.driver_user_id 
           AND cpp.id = period_id LIMIT 1),
        auth.uid(),
        now(),
        auth.uid()
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
        'Factoring fee for load #' || NEW.load_number || ' ($' || NEW.total_amount || ' × ' || owner_op_record.factoring_percentage || '%)',
        'applied',
        (SELECT dpc.id FROM driver_period_calculations dpc 
         JOIN company_payment_periods cpp ON cpp.id = dpc.company_payment_period_id
         WHERE dpc.driver_user_id = NEW.driver_user_id 
           AND cpp.id = period_id LIMIT 1),
        auth.uid(),
        now(),
        auth.uid()
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
        'Leasing fee for load #' || NEW.load_number || ' ($' || NEW.total_amount || ' × ' || owner_op_record.leasing_percentage || '%)',
        'applied',
        (SELECT dpc.id FROM driver_period_calculations dpc 
         JOIN company_payment_periods cpp ON cpp.id = dpc.company_payment_period_id
         WHERE dpc.driver_user_id = NEW.driver_user_id 
           AND cpp.id = period_id LIMIT 1),
        auth.uid(),
        now(),
        auth.uid()
      );
    END IF;
    
    -- Log de la operación
    RAISE NOTICE 'Generated percentage deductions for load %: Dispatching $%, Factoring $%, Leasing $%', 
      NEW.id, dispatching_amount, factoring_amount, leasing_amount;
    
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION fix_missing_percentage_deductions_retroactive()
RETURNS JSON 
LANGUAGE plpgsql 
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  load_record RECORD;
  processed_count INTEGER := 0;
  skipped_count INTEGER := 0;
BEGIN
  FOR load_record IN 
    SELECT l.* FROM loads l
    WHERE l.created_at >= '2025-08-25'
      AND l.created_at <= '2025-08-31 23:59:59'
      AND l.driver_user_id IS NOT NULL
      AND l.total_amount > 0
      -- Solo cargas que NO tienen deducciones por porcentaje
      AND NOT EXISTS (
        SELECT 1 FROM expense_instances ei
        JOIN expense_types et ON et.id = ei.expense_type_id
        WHERE ei.user_id = l.driver_user_id
          AND et.category = 'percentage_deduction'
          AND ei.expense_date = l.created_at::DATE
      )
  LOOP
    BEGIN
      -- Ejecutar la lógica de generación de deducciones manualmente
      EXECUTE 'SELECT auto_generate_percentage_deductions() FROM (SELECT $1.*) AS NEW' USING load_record;
      processed_count := processed_count + 1;
    EXCEPTION WHEN OTHERS THEN
      skipped_count := skipped_count + 1;
      RAISE NOTICE 'Error processing load %: %', load_record.id, SQLERRM;
    END;
  END LOOP;
  
  RETURN json_build_object(
    'success', true,
    'processed_loads', processed_count,
    'skipped_loads', skipped_count,
    'message', 'Retroactive percentage deductions completed'
  );
END;
$$;