-- Función de diagnóstico para verificar el estado de los cálculos de períodos de pago
CREATE OR REPLACE FUNCTION public.diagnose_payment_period_calculations()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result JSONB := '{}'::jsonb;
  recent_periods_count INTEGER;
  recent_calculations_count INTEGER;
  failed_calculations_count INTEGER;
  pending_loads_count INTEGER;
  orphaned_calculations_count INTEGER;
BEGIN
  -- Contar períodos recientes
  SELECT COUNT(*) INTO recent_periods_count
  FROM company_payment_periods 
  WHERE created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Contar cálculos recientes
  SELECT COUNT(*) INTO recent_calculations_count
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE cpp.created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Contar cálculos con problemas (valores todos en cero)
  SELECT COUNT(*) INTO failed_calculations_count
  FROM driver_period_calculations dpc
  WHERE dpc.gross_earnings = 0 
    AND dpc.fuel_expenses = 0 
    AND dpc.total_deductions = 0 
    AND dpc.other_income = 0
    AND dpc.created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Contar cargas sin período asignado
  SELECT COUNT(*) INTO pending_loads_count
  FROM loads l
  WHERE l.payment_period_id IS NULL
    AND l.created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Contar cálculos huérfanos (sin cargas asociadas)
  SELECT COUNT(*) INTO orphaned_calculations_count
  FROM driver_period_calculations dpc
  WHERE NOT EXISTS (
    SELECT 1 FROM loads l 
    WHERE l.driver_user_id = dpc.driver_user_id 
    AND l.payment_period_id = dpc.id
  )
  AND dpc.created_at >= CURRENT_DATE - INTERVAL '7 days';
  
  -- Construir resultado
  result := jsonb_build_object(
    'recent_periods_count', recent_periods_count,
    'recent_calculations_count', recent_calculations_count,
    'failed_calculations_count', failed_calculations_count,
    'pending_loads_count', pending_loads_count,
    'orphaned_calculations_count', orphaned_calculations_count,
    'diagnosis_date', now(),
    'status', CASE 
      WHEN failed_calculations_count > 0 THEN 'PROBLEMAS_DETECTADOS'
      WHEN pending_loads_count > 0 THEN 'CARGAS_SIN_PERIODO'
      WHEN orphaned_calculations_count > 0 THEN 'CALCULOS_HUERFANOS'
      ELSE 'NORMAL'
    END,
    'recommendations', CASE
      WHEN failed_calculations_count > 0 THEN 'Ejecutar recálculo para corregir cálculos con valores cero'
      WHEN pending_loads_count > 0 THEN 'Asignar períodos a las cargas pendientes'
      WHEN orphaned_calculations_count > 0 THEN 'Verificar integridad entre cargas y cálculos'
      ELSE 'Sistema funcionando correctamente'
    END
  );
  
  RETURN result;
END;
$function$;

-- Función mejorada para recálculo masivo de períodos problemáticos
CREATE OR REPLACE FUNCTION public.fix_payment_period_calculations_safe()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  calc_record RECORD;
  fixed_count INTEGER := 0;
  error_count INTEGER := 0;
  result JSONB;
BEGIN
  -- Verificar usuario autenticado
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;
  
  -- Solo permitir a superadmins ejecutar esta función
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND role = 'superadmin'
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Solo superadmins pueden ejecutar esta función';
  END IF;
  
  -- Recalcular todos los períodos con problemas (valores en cero)
  FOR calc_record IN 
    SELECT dpc.id, dpc.driver_user_id, dpc.company_payment_period_id
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE dpc.gross_earnings = 0 
      AND dpc.fuel_expenses = 0 
      AND dpc.total_deductions = 0 
      AND dpc.other_income = 0
      AND cpp.is_locked = false
      AND dpc.payment_status != 'paid'
      AND cpp.created_at >= CURRENT_DATE - INTERVAL '30 days'
  LOOP
    BEGIN
      -- Llamar la función de recálculo
      PERFORM calculate_driver_payment_period_with_validation(calc_record.id);
      fixed_count := fixed_count + 1;
      
      RAISE NOTICE 'Fixed calculation % for driver %', 
        calc_record.id, calc_record.driver_user_id;
        
    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      RAISE NOTICE 'Error fixing calculation %: %', 
        calc_record.id, SQLERRM;
    END;
  END LOOP;
  
  result := jsonb_build_object(
    'success', true,
    'fixed_calculations', fixed_count,
    'error_count', error_count,
    'execution_time', now(),
    'executed_by', current_user_id,
    'message', format('Se corrigieron %s cálculos con %s errores', fixed_count, error_count)
  );
  
  RETURN result;
END;
$function$;