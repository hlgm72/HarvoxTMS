-- =====================================================
-- 🔧 CORRECCIÓN CRÍTICA: Respetar load_assignment_criteria
-- Las funciones deben usar pickup_date o delivery_date según
-- la configuración de la compañía
-- =====================================================

-- 1. Corregir auto_generate_percentage_deductions para respetar load_assignment_criteria
CREATE OR REPLACE FUNCTION public.auto_generate_percentage_deductions()
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
  company_criteria TEXT;
  target_date DATE;
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
    
    -- 🔧 CRÍTICO: Obtener criterio de asignación de la empresa
    SELECT load_assignment_criteria INTO company_criteria
    FROM companies 
    WHERE id = target_company_id;
    
    -- Si no hay criterio definido, usar delivery_date por defecto
    IF company_criteria IS NULL THEN
      company_criteria := 'delivery_date';
    END IF;

    -- 🔧 CRÍTICO: Determinar fecha objetivo según criterio de empresa
    CASE company_criteria
      WHEN 'pickup_date' THEN
        target_date := NEW.pickup_date;
        RAISE LOG '📅 Usando pickup_date: %', target_date;
      WHEN 'assigned_date' THEN
        target_date := CURRENT_DATE;
        RAISE LOG '📅 Usando assigned_date (hoy): %', target_date;
      ELSE -- 'delivery_date' por defecto
        target_date := NEW.delivery_date;
        RAISE LOG '📅 Usando delivery_date: %', target_date;
    END CASE;

    -- Si no hay fecha objetivo válida, usar created_at como fallback
    IF target_date IS NULL THEN
      target_date := NEW.created_at::DATE;
      RAISE LOG '⚠️ No hay fecha de pickup/delivery, usando created_at: %', target_date;
    END IF;
    
    -- Asegurar que existe período de pago usando la fecha correcta
    period_id := create_payment_period_if_needed(target_company_id, target_date);
    
    IF period_id IS NULL THEN
      RAISE LOG '❌ auto_generate_percentage_deductions: No se pudo crear período para fecha %', target_date;
      RETURN NEW;
    END IF;
    
    RAISE LOG '✅ Período obtenido/creado: % para fecha %', period_id, target_date;
    
    -- Obtener el calculation_id del driver para este período
    SELECT id INTO calculation_id
    FROM user_payment_periods
    WHERE user_id = NEW.driver_user_id 
      AND id = period_id 
    LIMIT 1;
    
    IF calculation_id IS NULL THEN
      RAISE LOG '❌ auto_generate_percentage_deductions: No se encontró calculation para conductor % en período %', NEW.driver_user_id, period_id;
      RETURN NEW;
    END IF;
    
    -- Usar porcentajes de la carga
    dispatching_amount := ROUND(NEW.total_amount * COALESCE(NEW.dispatching_percentage, 0) / 100, 2);
    factoring_amount := ROUND(NEW.total_amount * COALESCE(NEW.factoring_percentage, 0) / 100, 2);
    leasing_amount := ROUND(NEW.total_amount * COALESCE(NEW.leasing_percentage, 0) / 100, 2);
    
    RAISE LOG '💰 Montos calculados - Dispatching: $%, Factoring: $%, Leasing: $%', 
      dispatching_amount, factoring_amount, leasing_amount;
    
    -- Crear deducción de dispatching
    IF dispatching_amount > 0 THEN
      INSERT INTO expense_instances (
        user_id, expense_type_id, amount, expense_date, description, 
        status, payment_period_id, created_by, applied_at, applied_by
      ) VALUES (
        NEW.driver_user_id, dispatching_type_id, dispatching_amount, target_date,
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
        NEW.driver_user_id, factoring_type_id, factoring_amount, target_date,
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
        NEW.driver_user_id, leasing_type_id, leasing_amount, target_date,
        'Leasing fee for load #' || NEW.load_number || ' ($' || NEW.total_amount || ' × ' || COALESCE(NEW.leasing_percentage, 0) || '%)',
        'applied', calculation_id, NEW.driver_user_id, now(), NEW.driver_user_id
      );
      RAISE LOG '✅ Deducción leasing creada: $%', leasing_amount;
    END IF;
    
    RAISE LOG '✅ auto_generate_percentage_deductions: Proceso completado para carga %', NEW.load_number;
    
  END IF;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  RAISE LOG '❌ auto_generate_percentage_deductions ERROR: % - Carga: %', SQLERRM, NEW.load_number;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.auto_generate_percentage_deductions() IS 
'Genera automáticamente deducciones de porcentaje (dispatching, factoring, leasing) 
cuando se crea una carga. RESPETA el campo load_assignment_criteria de la compañía 
para determinar si usar pickup_date, delivery_date o assigned_date.';