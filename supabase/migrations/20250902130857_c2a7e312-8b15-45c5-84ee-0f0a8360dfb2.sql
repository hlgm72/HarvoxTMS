-- ===============================================
-- 🔧 CORREGIR FUNCIÓN auto_generate_percentage_deductions
-- Arreglar el problema con las deducciones de porcentaje
-- ===============================================

CREATE OR REPLACE FUNCTION auto_generate_percentage_deductions()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  owner_op_record RECORD;
  dispatching_amount NUMERIC := 0;
  factoring_amount NUMERIC := 0;
  leasing_amount NUMERIC := 0;
  target_company_id UUID;
  period_id UUID;
  calculation_id UUID;
  dispatching_type_id UUID := '9e5a38ae-8851-4a8c-9bc7-11ac32cb7b10';
  factoring_type_id UUID := '1a3355f5-1a3b-49d6-89b4-acc7f259ebdb';
  leasing_type_id UUID := '28d59af7-c756-40bf-885e-fb995a744003';
BEGIN
  -- Solo procesar para cargas nuevas con conductor asignado y monto > 0
  IF TG_OP = 'INSERT' AND NEW.driver_user_id IS NOT NULL AND NEW.total_amount > 0 THEN
    
    RAISE LOG '💳 auto_generate_percentage_deductions: Procesando carga % por $% para conductor %', 
      NEW.load_number, NEW.total_amount, NEW.driver_user_id;
    
    -- Obtener company_id del conductor
    SELECT ucr.company_id INTO target_company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = NEW.driver_user_id AND ucr.is_active = true
    LIMIT 1;
    
    IF target_company_id IS NULL THEN
      RAISE LOG '❌ auto_generate_percentage_deductions: No se encontró compañía para conductor %', NEW.driver_user_id;
      RETURN NEW;
    END IF;
    
    -- Asegurar que existe período de pago
    period_id := create_payment_period_if_needed(target_company_id, NEW.created_at::DATE);
    
    IF period_id IS NULL THEN
      RAISE LOG '❌ auto_generate_percentage_deductions: No se pudo crear período para fecha %', NEW.created_at::DATE;
      RETURN NEW;
    END IF;
    
    -- Obtener el calculation_id del driver para este período
    SELECT dpc.id INTO calculation_id
    FROM driver_period_calculations dpc 
    WHERE dpc.driver_user_id = NEW.driver_user_id 
      AND dpc.company_payment_period_id = period_id 
    LIMIT 1;
    
    IF calculation_id IS NULL THEN
      RAISE LOG '❌ auto_generate_percentage_deductions: No se encontró calculation para conductor % en período %', NEW.driver_user_id, period_id;
      RETURN NEW;
    END IF;
    
    -- Usar porcentajes de la carga (ya heredados por el trigger inherit_percentages_on_load_insert)
    dispatching_amount := ROUND(NEW.total_amount * COALESCE(NEW.dispatching_percentage, 0) / 100, 2);
    factoring_amount := ROUND(NEW.total_amount * COALESCE(NEW.factoring_percentage, 0) / 100, 2);
    leasing_amount := ROUND(NEW.total_amount * COALESCE(NEW.leasing_percentage, 0) / 100, 2);
    
    RAISE LOG '💰 auto_generate_percentage_deductions: Dispatching=$%, Factoring=$%, Leasing=$%', 
      dispatching_amount, factoring_amount, leasing_amount;
    
    -- Crear deducción de dispatching
    IF dispatching_amount > 0 THEN
      INSERT INTO expense_instances (
        user_id, expense_type_id, amount, expense_date, description, 
        status, payment_period_id, created_by, applied_at, applied_by
      ) VALUES (
        NEW.driver_user_id, dispatching_type_id, dispatching_amount, NEW.created_at::DATE,
        'Dispatching fee for load #' || NEW.load_number || ' ($' || NEW.total_amount || ' × ' || COALESCE(NEW.dispatching_percentage, 0) || '%)',
        'applied', calculation_id, NEW.driver_user_id, now(), NEW.driver_user_id
      );
      RAISE LOG '✅ Deducción dispatching creada: $%', dispatching_amount;
    END IF;
    
    -- Crear deducción de factoring
    IF factoring_amount > 0 THEN
      INSERT INTO expense_instances (
        user_id, expense_type_id, amount, expense_date, description,
        status, payment_period_id, created_by, applied_at, applied_by
      ) VALUES (
        NEW.driver_user_id, factoring_type_id, factoring_amount, NEW.created_at::DATE,
        'Factoring fee for load #' || NEW.load_number || ' ($' || NEW.total_amount || ' × ' || COALESCE(NEW.factoring_percentage, 0) || '%)',
        'applied', calculation_id, NEW.driver_user_id, now(), NEW.driver_user_id
      );
      RAISE LOG '✅ Deducción factoring creada: $%', factoring_amount;
    END IF;
    
    -- Crear deducción de leasing
    IF leasing_amount > 0 THEN
      INSERT INTO expense_instances (
        user_id, expense_type_id, amount, expense_date, description,
        status, payment_period_id, created_by, applied_at, applied_by
      ) VALUES (
        NEW.driver_user_id, leasing_type_id, leasing_amount, NEW.created_at::DATE,
        'Leasing fee for load #' || NEW.load_number || ' ($' || NEW.total_amount || ' × ' || COALESCE(NEW.leasing_percentage, 0) || '%)',
        'applied', calculation_id, NEW.driver_user_id, now(), NEW.driver_user_id
      );
      RAISE LOG '✅ Deducción leasing creada: $%', leasing_amount;
    END IF;
    
  END IF;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '❌ auto_generate_percentage_deductions ERROR: % - Carga: %', SQLERRM, NEW.load_number;
  RETURN NEW;
END;
$$;