-- ===============================================
-- 🔄 RECÁLCULO AUTOMÁTICO DE DEDUCCIONES POR PORCENTAJE EN UPDATES
-- ===============================================
-- Cuando se edita una carga, regenerar deducciones por porcentaje correctamente

-- Función para limpiar deducciones específicas de una carga
CREATE OR REPLACE FUNCTION public.cleanup_load_percentage_deductions(
  load_id_param UUID,
  load_number_param TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  -- Eliminar deducciones por porcentaje específicas de esta carga
  DELETE FROM expense_instances ei
  WHERE ei.description LIKE '%load #' || load_number_param || '%'
    AND ei.expense_type_id IN (
      SELECT id FROM expense_types 
      WHERE category = 'percentage_deduction'
    );
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE LOG 'Cleaned up % percentage deductions for load #%', deleted_count, load_number_param;
  RETURN deleted_count;
END;
$$;

-- Función mejorada que maneja UPDATE de cargas
CREATE OR REPLACE FUNCTION public.auto_generate_percentage_deductions_on_update()
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
  dispatching_type_id UUID := '9e5a38ae-8851-4a8c-9bc7-11ac32cb7b10';
  factoring_type_id UUID := '1a3355f5-1a3b-49d6-89b4-acc7f259ebdb';
  leasing_type_id UUID := '28d59af7-c756-40bf-885e-fb995a744003';
  cleaned_count INTEGER;
BEGIN
  -- Solo procesar si hay cambios relevantes en UPDATE
  IF TG_OP = 'UPDATE' AND (
    OLD.total_amount IS DISTINCT FROM NEW.total_amount OR
    OLD.driver_user_id IS DISTINCT FROM NEW.driver_user_id OR
    OLD.dispatching_percentage IS DISTINCT FROM NEW.dispatching_percentage OR
    OLD.factoring_percentage IS DISTINCT FROM NEW.factoring_percentage OR
    OLD.leasing_percentage IS DISTINCT FROM NEW.leasing_percentage
  ) THEN
    
    -- Disable RLS temporalmente
    SET row_security = OFF;
    
    -- 1. LIMPIAR deducciones existentes de la carga anterior
    SELECT cleanup_load_percentage_deductions(OLD.id, OLD.load_number) INTO cleaned_count;
    
    -- 2. REGENERAR deducciones con los nuevos valores si hay conductor
    IF NEW.driver_user_id IS NOT NULL AND NEW.total_amount > 0 THEN
      
      -- Obtener company_id del conductor
      SELECT company_id INTO target_company_id
      FROM user_company_roles 
      WHERE user_id = NEW.driver_user_id AND is_active = true
      LIMIT 1;
      
      IF target_company_id IS NULL THEN
        SET row_security = ON;
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
      
      -- Crear deducciones actualizadas
      IF dispatching_amount > 0 AND calculation_id IS NOT NULL THEN
        INSERT INTO expense_instances (
          id, user_id, expense_type_id, amount, expense_date, description, status, payment_period_id, created_by, applied_at, applied_by
        ) VALUES (
          gen_random_uuid(), NEW.driver_user_id, dispatching_type_id, dispatching_amount, NEW.created_at::DATE,
          'Dispatching fee for load #' || NEW.load_number || ' ($' || NEW.total_amount || ' × ' || COALESCE(owner_op_record.dispatching_percentage, 0) || '%)',
          'applied', calculation_id, NEW.driver_user_id, now(), NEW.driver_user_id
        );
      END IF;
      
      IF factoring_amount > 0 AND calculation_id IS NOT NULL THEN
        INSERT INTO expense_instances (
          id, user_id, expense_type_id, amount, expense_date, description, status, payment_period_id, created_by, applied_at, applied_by
        ) VALUES (
          gen_random_uuid(), NEW.driver_user_id, factoring_type_id, factoring_amount, NEW.created_at::DATE,
          'Factoring fee for load #' || NEW.load_number || ' ($' || NEW.total_amount || ' × ' || COALESCE(owner_op_record.factoring_percentage, 0) || '%)',
          'applied', calculation_id, NEW.driver_user_id, now(), NEW.driver_user_id
        );
      END IF;
      
      IF leasing_amount > 0 AND calculation_id IS NOT NULL THEN
        INSERT INTO expense_instances (
          id, user_id, expense_type_id, amount, expense_date, description, status, payment_period_id, created_by, applied_at, applied_by
        ) VALUES (
          gen_random_uuid(), NEW.driver_user_id, leasing_type_id, leasing_amount, NEW.created_at::DATE,
          'Leasing fee for load #' || NEW.load_number || ' ($' || NEW.total_amount || ' × ' || COALESCE(owner_op_record.leasing_percentage, 0) || '%)',
          'applied', calculation_id, NEW.driver_user_id, now(), NEW.driver_user_id
        );
      END IF;
      
      RAISE NOTICE 'Updated percentage deductions for load %: Cleaned %, Generated Dispatching $%, Factoring $%, Leasing $%', 
        NEW.load_number, cleaned_count, dispatching_amount, factoring_amount, leasing_amount;
    END IF;
    
    -- Re-enable RLS
    SET row_security = ON;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Crear el trigger para UPDATE en loads
DROP TRIGGER IF EXISTS trigger_update_percentage_deductions ON loads;
CREATE TRIGGER trigger_update_percentage_deductions
    AFTER UPDATE ON loads
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_percentage_deductions_on_update();

-- Verificar que el trigger se creó
SELECT 
  trigger_name,
  event_object_table,
  action_timing,
  event_manipulation
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_percentage_deductions';