-- Corregir el trigger auto_generate_percentage_deductions para respetar load_assignment_criteria
CREATE OR REPLACE FUNCTION public.auto_generate_percentage_deductions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  owner_op_record RECORD;
  dispatching_amount NUMERIC;
  factoring_amount NUMERIC;
  leasing_amount NUMERIC;
  target_company_id UUID;
  period_id UUID;
  calculation_id UUID;
  dispatching_type_id UUID := '9e5a38ae-8851-4a8c-9bc7-11ac32cb7b10';
  factoring_type_id UUID := '1a3355f5-1a3b-49d6-89b4-acc7f259ebdb';
  leasing_type_id UUID := '28d59af7-c756-40bf-885e-fb995a744003';
  company_criteria TEXT;
  target_date DATE;
BEGIN
  -- Solo procesar para cargas nuevas con conductor asignado
  IF TG_OP = 'INSERT' AND NEW.driver_user_id IS NOT NULL AND NEW.total_amount > 0 THEN
    
    -- Disable RLS temporalmente para este trigger
    SET row_security = OFF;
    
    -- Obtener company_id del conductor
    SELECT company_id INTO target_company_id
    FROM user_company_roles 
    WHERE user_id = NEW.driver_user_id AND is_active = true
    LIMIT 1;
    
    IF target_company_id IS NULL THEN
      SET row_security = ON;
      RETURN NEW;
    END IF;
    
    -- 🔧 CORRECCIÓN: Obtener criterio de asignación de la empresa
    SELECT load_assignment_criteria INTO company_criteria
    FROM companies 
    WHERE id = target_company_id;
    
    -- Si no hay criterio definido, usar delivery_date por defecto
    IF company_criteria IS NULL THEN
      company_criteria := 'delivery_date';
    END IF;

    -- 🔧 CORRECCIÓN: Determinar fecha objetivo según criterio de empresa
    CASE company_criteria
      WHEN 'pickup_date' THEN
        target_date := NEW.pickup_date;
      WHEN 'assigned_date' THEN
        target_date := CURRENT_DATE;
      ELSE -- 'delivery_date' por defecto
        target_date := NEW.delivery_date;
    END CASE;

    -- Si no hay fecha objetivo válida, usar created_at como fallback
    IF target_date IS NULL THEN
      target_date := NEW.created_at::DATE;
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
    
    -- 🔧 CORRECCIÓN: Usar la fecha objetivo correcta
    SELECT create_payment_period_if_needed(target_company_id, target_date) INTO period_id;
    
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
    
    -- Crear deducciones directamente
    IF dispatching_amount > 0 AND calculation_id IS NOT NULL THEN
      INSERT INTO expense_instances (
        id, user_id, expense_type_id, amount, expense_date, description, status, payment_period_id, created_by, applied_at, applied_by
      ) VALUES (
        gen_random_uuid(), NEW.driver_user_id, dispatching_type_id, dispatching_amount, target_date,
        'Dispatching fee for load #' || NEW.load_number || ' ($' || NEW.total_amount || ' × ' || COALESCE(owner_op_record.dispatching_percentage, 0) || '%)',
        'applied', calculation_id, NEW.driver_user_id, now(), NEW.driver_user_id
      );
    END IF;
    
    IF factoring_amount > 0 AND calculation_id IS NOT NULL THEN
      INSERT INTO expense_instances (
        id, user_id, expense_type_id, amount, expense_date, description, status, payment_period_id, created_by, applied_at, applied_by
      ) VALUES (
        gen_random_uuid(), NEW.driver_user_id, factoring_type_id, factoring_amount, target_date,
        'Factoring fee for load #' || NEW.load_number || ' ($' || NEW.total_amount || ' × ' || COALESCE(owner_op_record.factoring_percentage, 0) || '%)',
        'applied', calculation_id, NEW.driver_user_id, now(), NEW.driver_user_id
      );
    END IF;
    
    IF leasing_amount > 0 AND calculation_id IS NOT NULL THEN
      INSERT INTO expense_instances (
        id, user_id, expense_type_id, amount, expense_date, description, status, payment_period_id, created_by, applied_at, applied_by
      ) VALUES (
        gen_random_uuid(), NEW.driver_user_id, leasing_type_id, leasing_amount, target_date,
        'Leasing fee for load #' || NEW.load_number || ' ($' || NEW.total_amount || ' × ' || COALESCE(owner_op_record.leasing_percentage, 0) || '%)',
        'applied', calculation_id, NEW.driver_user_id, now(), NEW.driver_user_id
      );
    END IF;
    
    -- Re-enable RLS
    SET row_security = ON;
    
    -- Log de la operación con fecha correcta
    RAISE NOTICE 'Generated percentage deductions for load % (using % criteria, target_date: %): Dispatching $%, Factoring $%, Leasing $%', 
      NEW.id, company_criteria, target_date, dispatching_amount, factoring_amount, leasing_amount;
    
  END IF;
  
  RETURN NEW;
END;
$function$;