-- ========================================
-- 🚨 CORRECCIÓN CRÍTICA DEL SISTEMA DE CÁLCULOS v3
-- ========================================
-- Corrige los problemas identificados en las funciones de cálculo
-- que causaban resultados de $0.00

-- ========================================
-- 1. ELIMINAR FUNCIONES EXISTENTES
-- ========================================

DROP FUNCTION IF EXISTS public.recalculate_driver_payment_period(uuid, uuid);
DROP FUNCTION IF EXISTS public.validate_driver_calculation_consistency(uuid);
DROP FUNCTION IF EXISTS public.auto_recalculate_driver_payment_period(uuid, uuid);

-- ========================================
-- 2. RECREAR recalculate_driver_payment_period CORREGIDA
-- ========================================
-- Problema: Llamaba a calculate_driver_payment_period_v2 con un solo parámetro
-- Solución: Pasar correctamente ambos parámetros (driver_user_id, company_payment_period_id)

CREATE OR REPLACE FUNCTION public.recalculate_driver_payment_period(
  target_driver_user_id UUID,
  target_company_payment_period_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  result JSONB;
  existing_calculation_id UUID;
BEGIN
  RAISE LOG '🔄 RECALCULATE: Iniciando recálculo para driver % en período %', 
    target_driver_user_id, target_company_payment_period_id;

  -- Verificar que exista el período
  IF NOT EXISTS (
    SELECT 1 FROM company_payment_periods 
    WHERE id = target_company_payment_period_id
  ) THEN
    RAISE EXCEPTION 'Período de pago no encontrado: %', target_company_payment_period_id;
  END IF;

  -- Obtener ID del cálculo existente si existe
  SELECT id INTO existing_calculation_id
  FROM driver_period_calculations
  WHERE driver_user_id = target_driver_user_id 
  AND company_payment_period_id = target_company_payment_period_id;

  -- 🚨 CORRECCIÓN CRÍTICA: Llamar con ambos parámetros correctos
  RAISE LOG '🔄 RECALCULATE: Llamando calculate_driver_payment_period_v2 con parámetros: driver_user_id=%, company_payment_period_id=%',
    target_driver_user_id, target_company_payment_period_id;
    
  result := calculate_driver_payment_period_v2(
    target_driver_user_id, 
    target_company_payment_period_id
  );

  RAISE LOG '🔄 RECALCULATE: Resultado del cálculo: %', result;

  RETURN jsonb_build_object(
    'success', true,
    'driver_user_id', target_driver_user_id,
    'company_payment_period_id', target_company_payment_period_id,
    'existing_calculation_id', existing_calculation_id,
    'calculation_result', result,
    'recalculated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '❌ RECALCULATE ERROR: % - SQLSTATE: %', SQLERRM, SQLSTATE;
  RAISE EXCEPTION 'Error en recálculo: %', SQLERRM;
END;
$$;

-- ========================================
-- 3. RECREAR validate_driver_calculation_consistency CORREGIDA
-- ========================================
-- Problema: Usaba target_calculation_id en lugar de company_payment_period_id para buscar cargas
-- Solución: Usar correctamente company_payment_period_id de la tabla company_payment_periods

CREATE OR REPLACE FUNCTION public.validate_driver_calculation_consistency(
  target_calculation_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  calculation_record RECORD;
  loads_total NUMERIC := 0;
  fuel_total NUMERIC := 0;
  deductions_total NUMERIC := 0;
  expected_net NUMERIC := 0;
  consistency_issues JSONB := '[]'::jsonb;
  target_period_id UUID;
  target_driver_id UUID;
BEGIN
  RAISE LOG '🔍 VALIDATION: Iniciando validación para cálculo %', target_calculation_id;

  -- Obtener el registro de cálculo
  SELECT * INTO calculation_record
  FROM driver_period_calculations
  WHERE id = target_calculation_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Cálculo no encontrado');
  END IF;

  target_period_id := calculation_record.company_payment_period_id;
  target_driver_id := calculation_record.driver_user_id;

  RAISE LOG '🔍 VALIDATION: Driver %, Período %', target_driver_id, target_period_id;

  -- 🚨 CORRECCIÓN CRÍTICA: Usar company_payment_period_id correctamente
  -- Calcular total de cargas usando el período correcto
  SELECT COALESCE(SUM(l.total_amount), 0) INTO loads_total
  FROM loads l
  WHERE l.driver_user_id = target_driver_id
  AND l.payment_period_id = target_period_id;

  RAISE LOG '🔍 VALIDATION: Cargas encontradas con total: %', loads_total;

  -- Calcular total de combustible
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO fuel_total
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = target_driver_id
  AND fe.payment_period_id = target_period_id;

  RAISE LOG '🔍 VALIDATION: Combustible total: %', fuel_total;

  -- Calcular total de deducciones
  SELECT COALESCE(SUM(ei.amount), 0) INTO deductions_total
  FROM expense_instances ei
  WHERE ei.payment_period_id = target_calculation_id
  AND ei.user_id = target_driver_id;

  RAISE LOG '🔍 VALIDATION: Deducciones total: %', deductions_total;

  -- Validar consistencia
  expected_net := loads_total - fuel_total - deductions_total;

  IF ABS(calculation_record.net_payment - expected_net) > 0.01 THEN
    consistency_issues := consistency_issues || jsonb_build_object(
      'issue', 'net_payment_mismatch',
      'stored_net', calculation_record.net_payment,
      'expected_net', expected_net,
      'difference', calculation_record.net_payment - expected_net
    );
  END IF;

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(consistency_issues) = 0,
    'calculation_id', target_calculation_id,
    'driver_user_id', target_driver_id,
    'period_id', target_period_id,
    'totals', jsonb_build_object(
      'loads', loads_total,
      'fuel', fuel_total,
      'deductions', deductions_total,
      'expected_net', expected_net,
      'stored_net', calculation_record.net_payment
    ),
    'issues', consistency_issues,
    'validated_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '❌ VALIDATION ERROR: %', SQLERRM;
  RETURN jsonb_build_object(
    'valid', false, 
    'error', SQLERRM,
    'calculation_id', target_calculation_id
  );
END;
$$;

-- ========================================
-- 4. RECREAR auto_recalculate_driver_payment_period CORREGIDA
-- ========================================
-- Problema: Confusión con los IDs pasados a la función
-- Solución: Asegurar que se pasan correctamente driver_user_id y company_payment_period_id

CREATE OR REPLACE FUNCTION public.auto_recalculate_driver_payment_period(
  target_driver_user_id UUID,
  target_company_payment_period_id UUID
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RAISE LOG '🔄 AUTO_RECALC: Iniciando auto-recálculo para driver % en período %', 
    target_driver_user_id, target_company_payment_period_id;

  -- Verificar que los parámetros son válidos
  IF target_driver_user_id IS NULL OR target_company_payment_period_id IS NULL THEN
    RAISE LOG '❌ AUTO_RECALC: Parámetros inválidos - driver: %, período: %', 
      target_driver_user_id, target_company_payment_period_id;
    RETURN;
  END IF;

  -- Llamar a la función de recálculo con parámetros correctos
  PERFORM recalculate_driver_payment_period(
    target_driver_user_id, 
    target_company_payment_period_id
  );

  RAISE LOG '✅ AUTO_RECALC: Recálculo completado para driver % en período %', 
    target_driver_user_id, target_company_payment_period_id;

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '❌ AUTO_RECALC ERROR: % - Driver: %, Período: %', 
    SQLERRM, target_driver_user_id, target_company_payment_period_id;
END;
$$;

-- ========================================
-- 5. RECREAR TRIGGERS CON LOGGING MEJORADO
-- ========================================
-- Los triggers deben pasar correctamente driver_user_id y company_payment_period_id

-- Eliminar triggers existentes
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_loads_insert ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_loads_update ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_loads_delete ON loads;

-- Recrear función de trigger con logging mejorado
CREATE OR REPLACE FUNCTION public.trigger_auto_recalculate_on_loads()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  affected_period_id UUID;
  affected_driver_user_id UUID;
  period_company_id UUID;
BEGIN
  RAISE LOG '🔄 TRIGGER_LOADS: Operación % ejecutada en loads', TG_OP;

  -- Para INSERT/UPDATE
  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    affected_period_id := NEW.payment_period_id;
    affected_driver_user_id := NEW.driver_user_id;
    
    RAISE LOG '🔄 TRIGGER_LOADS: NEW - período: %, driver: %', 
      affected_period_id, affected_driver_user_id;
  END IF;

  -- Para DELETE
  IF TG_OP = 'DELETE' THEN
    affected_period_id := OLD.payment_period_id;
    affected_driver_user_id := OLD.driver_user_id;
    
    RAISE LOG '🔄 TRIGGER_LOADS: OLD - período: %, driver: %', 
      affected_period_id, affected_driver_user_id;
  END IF;

  -- Solo proceder si tenemos período y conductor válidos
  IF affected_period_id IS NOT NULL AND affected_driver_user_id IS NOT NULL THEN
    
    -- Verificar que el payment_period_id corresponde a un company_payment_period
    SELECT company_id INTO period_company_id
    FROM company_payment_periods
    WHERE id = affected_period_id;
    
    IF period_company_id IS NOT NULL THEN
      RAISE LOG '🔄 TRIGGER_LOADS: Ejecutando recálculo para driver % en período % (compañía %)', 
        affected_driver_user_id, affected_period_id, period_company_id;
        
      PERFORM public.auto_recalculate_driver_payment_period(
        affected_driver_user_id, 
        affected_period_id
      );
    ELSE
      RAISE LOG '⚠️ TRIGGER_LOADS: payment_period_id % no encontrado en company_payment_periods', 
        affected_period_id;
    END IF;
  ELSE
    RAISE LOG '⚠️ TRIGGER_LOADS: Parámetros inválidos - período: %, driver: %', 
      affected_period_id, affected_driver_user_id;
  END IF;

  RETURN COALESCE(NEW, OLD);

EXCEPTION WHEN OTHERS THEN
  RAISE LOG '❌ TRIGGER_LOADS ERROR: % - Driver: %, Período: %', 
    SQLERRM, affected_driver_user_id, affected_period_id;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Crear triggers mejorados
CREATE TRIGGER trigger_auto_recalculate_on_loads_insert
  AFTER INSERT ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_recalculate_on_loads();

CREATE TRIGGER trigger_auto_recalculate_on_loads_update
  AFTER UPDATE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_recalculate_on_loads();

CREATE TRIGGER trigger_auto_recalculate_on_loads_delete
  AFTER DELETE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_recalculate_on_loads();

-- ========================================
-- 6. AGREGAR FUNCIÓN DE DIAGNÓSTICO
-- ========================================
-- Para facilitar el debugging futuro

CREATE OR REPLACE FUNCTION public.diagnose_payment_calculation_issues(
  target_driver_user_id UUID,
  target_company_payment_period_id UUID
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  period_exists BOOLEAN := false;
  driver_exists BOOLEAN := false;
  loads_count INTEGER := 0;
  fuel_count INTEGER := 0;
  deductions_count INTEGER := 0;
  calculation_exists BOOLEAN := false;
  result JSONB;
BEGIN
  -- Verificar período existe
  SELECT EXISTS(SELECT 1 FROM company_payment_periods WHERE id = target_company_payment_period_id) 
  INTO period_exists;
  
  -- Verificar conductor existe
  SELECT EXISTS(SELECT 1 FROM driver_profiles WHERE user_id = target_driver_user_id) 
  INTO driver_exists;
  
  -- Contar cargas
  SELECT COUNT(*) INTO loads_count
  FROM loads l
  WHERE l.driver_user_id = target_driver_user_id
  AND l.payment_period_id = target_company_payment_period_id;
  
  -- Contar combustible
  SELECT COUNT(*) INTO fuel_count
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = target_driver_user_id
  AND fe.payment_period_id = target_company_payment_period_id;
  
  -- Contar deducciones
  SELECT COUNT(*) INTO deductions_count
  FROM expense_instances ei
  JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
  WHERE dpc.driver_user_id = target_driver_user_id
  AND dpc.company_payment_period_id = target_company_payment_period_id;
  
  -- Verificar si existe cálculo
  SELECT EXISTS(
    SELECT 1 FROM driver_period_calculations 
    WHERE driver_user_id = target_driver_user_id 
    AND company_payment_period_id = target_company_payment_period_id
  ) INTO calculation_exists;
  
  result := jsonb_build_object(
    'driver_user_id', target_driver_user_id,
    'company_payment_period_id', target_company_payment_period_id,
    'checks', jsonb_build_object(
      'period_exists', period_exists,
      'driver_exists', driver_exists,
      'calculation_exists', calculation_exists
    ),
    'counts', jsonb_build_object(
      'loads', loads_count,
      'fuel_expenses', fuel_count,
      'deductions', deductions_count
    ),
    'diagnosed_at', now()
  );
  
  RAISE LOG '🔍 DIAGNOSIS: %', result;
  
  RETURN result;
END;
$$;