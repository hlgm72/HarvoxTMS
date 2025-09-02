-- ===============================================
-- 🚨 CORRECCIÓN: FUNCIÓN TRIGGER auto_assign_payment_period_to_load
-- ===============================================
-- El problema: la función trata de acceder a NEW.company_id pero la tabla loads no tiene ese campo
-- Solución: obtener company_id a través del driver_user_id

CREATE OR REPLACE FUNCTION public.auto_assign_payment_period_to_load()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_company_id UUID;
  company_criteria TEXT;
  target_date DATE;
  matching_period_id UUID;
BEGIN
  -- Si ya tiene payment_period_id asignado, no hacer nada
  IF NEW.payment_period_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Obtener company_id a través del driver_user_id
  SELECT DISTINCT ucr.company_id INTO target_company_id
  FROM user_company_roles ucr
  WHERE ucr.user_id = NEW.driver_user_id
    AND ucr.is_active = true
  LIMIT 1;
  
  -- Si no se puede determinar la empresa, salir sin modificar
  IF target_company_id IS NULL THEN
    RAISE LOG 'auto_assign_payment_period_to_load: No se pudo determinar company_id para driver %', NEW.driver_user_id;
    RETURN NEW;
  END IF;

  -- Obtener el criterio de asignación de la empresa
  SELECT load_assignment_criteria INTO company_criteria
  FROM companies 
  WHERE id = target_company_id;
  
  -- Si no hay criterio definido, usar delivery_date por defecto
  IF company_criteria IS NULL THEN
    company_criteria := 'delivery_date';
  END IF;
  
  -- Determinar qué fecha usar según el criterio de la empresa
  CASE company_criteria
    WHEN 'pickup_date' THEN
      target_date := NEW.pickup_date;
    WHEN 'assigned_date' THEN
      target_date := NEW.created_at::DATE;
    ELSE -- 'delivery_date' por defecto
      target_date := NEW.delivery_date;
  END CASE;
  
  -- Solo proceder si tenemos una fecha válida
  IF target_date IS NOT NULL THEN
    -- Buscar período de pago que contenga la fecha objetivo
    SELECT id INTO matching_period_id
    FROM company_payment_periods
    WHERE company_id = target_company_id
      AND period_start_date <= target_date
      AND period_end_date >= target_date
      AND status IN ('open', 'processing')
    ORDER BY period_start_date DESC
    LIMIT 1;
    
    -- Si no hay período existente, crear uno usando el sistema on-demand
    IF matching_period_id IS NULL THEN
      matching_period_id := create_payment_period_if_needed(target_company_id, target_date);
    END IF;
    
    -- Asignar el período encontrado/creado
    IF matching_period_id IS NOT NULL THEN
      NEW.payment_period_id := matching_period_id;
      RAISE LOG 'auto_assign_payment_period_to_load: Asignado período % a carga %', matching_period_id, NEW.load_number;
    END IF;
  END IF;
  
  RETURN NEW;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG 'Error en auto_assign_payment_period_to_load: %', SQLERRM;
  RETURN NEW;
END;
$function$;

-- Log de corrección
DO $$
BEGIN
    RAISE NOTICE '✅ FUNCIÓN CORREGIDA: auto_assign_payment_period_to_load';
    RAISE NOTICE '   - Ahora obtiene company_id a través de driver_user_id';
    RAISE NOTICE '   - Manejo robusto de errores';
    RAISE NOTICE '   - Integración con sistema on-demand';
END $$;