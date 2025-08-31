-- 🚨 CORRECCIÓN CRÍTICA: Eliminar completamente la generación masiva de períodos
-- Todas las funciones trigger DEBEN usar SOLO el sistema on-demand

-- 1. Corregir assign_payment_period_after_stops
CREATE OR REPLACE FUNCTION public.assign_payment_period_after_stops()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_date DATE;
  calculated_period_id UUID;
  assignment_criteria TEXT;
  user_company_id UUID;
  driver_user_id_to_use UUID;
BEGIN
  -- Solo procesar si cambiaron las fechas relevantes o el conductor
  IF (OLD.pickup_date IS DISTINCT FROM NEW.pickup_date) OR 
     (OLD.delivery_date IS DISTINCT FROM NEW.delivery_date) OR 
     (OLD.driver_user_id IS DISTINCT FROM NEW.driver_user_id) THEN
    
    -- Usar el conductor asignado o el creador
    driver_user_id_to_use := COALESCE(NEW.driver_user_id, NEW.created_by);
    
    IF driver_user_id_to_use IS NOT NULL THEN
      -- Obtener empresa y criterio de asignación
      SELECT ucr.company_id, c.load_assignment_criteria 
      INTO user_company_id, assignment_criteria
      FROM public.user_company_roles ucr
      JOIN public.companies c ON c.id = ucr.company_id
      WHERE ucr.user_id = driver_user_id_to_use 
      AND ucr.is_active = true
      LIMIT 1;
      
      IF user_company_id IS NOT NULL THEN
        -- Determinar fecha objetivo según criterio de la empresa
        IF assignment_criteria = 'delivery_date' THEN
          target_date := COALESCE(NEW.delivery_date, NEW.pickup_date, CURRENT_DATE);
        ELSE -- pickup_date (default)
          target_date := COALESCE(NEW.pickup_date, CURRENT_DATE);
        END IF;
        
        -- ✅ USAR SISTEMA ON-DEMAND - NO MASIVO
        calculated_period_id := public.create_payment_period_if_needed(user_company_id, target_date);
        
        -- Asignar período calculado
        NEW.payment_period_id := calculated_period_id;
        
        RAISE LOG 'assign_payment_period_after_stops: ON-DEMAND period % assigned for date % (company %)', 
          calculated_period_id, target_date, user_company_id;
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- 2. Corregir assign_load_to_company_payment_period
CREATE OR REPLACE FUNCTION public.assign_load_to_company_payment_period()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  target_date DATE;
  calculated_period_id UUID;
  assignment_criteria TEXT;
  company_id_found UUID;
BEGIN
  -- Fix the ambiguous company_id reference with explicit table qualification
  SELECT ucr.company_id, c.load_assignment_criteria 
  INTO company_id_found, assignment_criteria
  FROM public.user_company_roles ucr
  JOIN public.companies c ON c.id = ucr.company_id  -- FIXED: explicit table qualification
  WHERE ucr.user_id = NEW.driver_user_id 
  AND ucr.role = 'driver' 
  AND ucr.is_active = true
  LIMIT 1;
  
  -- Determinar la fecha objetivo según el criterio configurado
  IF assignment_criteria = 'delivery_date' THEN
    target_date := COALESCE(NEW.delivery_date, NEW.pickup_date, CURRENT_DATE);
  ELSE -- pickup_date (default)
    target_date := COALESCE(NEW.pickup_date, CURRENT_DATE);
  END IF;
  
  -- ✅ USAR SISTEMA ON-DEMAND - NO MASIVO
  calculated_period_id := public.create_payment_period_if_needed(company_id_found, target_date);
  
  -- Asignar el período a la carga
  NEW.payment_period_id := calculated_period_id;
  
  RAISE LOG 'assign_load_to_company_payment_period: ON-DEMAND period % assigned for date % (company %)', 
    calculated_period_id, target_date, company_id_found;
  
  RETURN NEW;
END;
$$;

-- 3. PROHIBIR el uso de generate_payment_periods - Crear función de bloqueo
CREATE OR REPLACE FUNCTION public.generate_payment_periods(
  company_id_param uuid, 
  from_date_param timestamp with time zone, 
  to_date_param timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- 🚨 FUNCIÓN BLOQUEADA - No debe usarse más
  RAISE EXCEPTION 'FUNCIÓN DESHABILITADA: generate_payment_periods() crea períodos masivos innecesarios. Use create_payment_period_if_needed() para sistema on-demand.';
END;
$$;

-- 4. Crear función de limpieza para eliminar períodos innecesarios creados hoy
CREATE OR REPLACE FUNCTION public.cleanup_unnecessary_periods_created_today()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER := 0;
  period_record RECORD;
BEGIN
  -- Solo períodos creados hoy que estén vacíos (sin loads, ni deductions, ni calculations con datos)
  FOR period_record IN 
    SELECT cpp.id, cpp.period_start_date, cpp.period_end_date, cpp.company_id
    FROM company_payment_periods cpp
    WHERE DATE(cpp.created_at) = CURRENT_DATE
    AND cpp.status = 'open'
    AND NOT EXISTS (
      -- No tiene loads
      SELECT 1 FROM loads l WHERE l.payment_period_id IN (
        SELECT dpc.id FROM driver_period_calculations dpc 
        WHERE dpc.company_payment_period_id = cpp.id
      )
    )
    AND NOT EXISTS (
      -- No tiene expense_instances
      SELECT 1 FROM expense_instances ei WHERE ei.payment_period_id IN (
        SELECT dpc.id FROM driver_period_calculations dpc 
        WHERE dpc.company_payment_period_id = cpp.id
      )
    )
    AND NOT EXISTS (
      -- No tiene calculations con valores > 0
      SELECT 1 FROM driver_period_calculations dpc 
      WHERE dpc.company_payment_period_id = cpp.id
      AND (dpc.gross_earnings > 0 OR dpc.fuel_expenses > 0 OR dpc.total_deductions > 0)
    )
  LOOP
    -- Eliminar calculations vacíos
    DELETE FROM driver_period_calculations 
    WHERE company_payment_period_id = period_record.id;
    
    -- Eliminar el período innecesario
    DELETE FROM company_payment_periods 
    WHERE id = period_record.id;
    
    deleted_count := deleted_count + 1;
    
    RAISE LOG 'cleanup_unnecessary_periods: Deleted empty period % (% to %) for company %', 
      period_record.id, period_record.period_start_date, period_record.period_end_date, period_record.company_id;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'deleted_periods', deleted_count,
    'message', 'Períodos innecesarios eliminados exitosamente',
    'cleaned_at', now()
  );
END;
$$;

-- 5. Ejecutar limpieza inmediata de períodos creados hoy
SELECT public.cleanup_unnecessary_periods_created_today();