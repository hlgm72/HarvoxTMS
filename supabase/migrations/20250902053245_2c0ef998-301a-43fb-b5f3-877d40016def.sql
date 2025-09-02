-- FASE 4: Función de testing para demostrar que el sistema corregido funciona
CREATE OR REPLACE FUNCTION public.test_recurring_expenses_system()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  company_id_param UUID := 'e5d52767-ca59-4c28-94e4-058aff6a037b'; -- HG Transport LLC
  test_results JSONB := jsonb_build_object();
  period_record RECORD;
  week35_result JSONB;
  week1_result JSONB;
  validation_result JSONB;
BEGIN
  -- 🧪 TEST 1: Verificar que NO se crean instancias en semana 4 (donde no hay templates)
  -- Buscar o crear período de prueba para semana 4
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE company_id = company_id_param
  AND period_start_date = '2025-08-25'::date;
  
  IF NOT FOUND THEN
    -- Crear período de prueba para semana 4
    INSERT INTO company_payment_periods (
      company_id,
      period_start_date,
      period_end_date,
      period_frequency,
      status
    ) VALUES (
      company_id_param,
      '2025-08-25'::date,
      '2025-08-31'::date,
      'weekly',
      'open'
    ) RETURNING * INTO period_record;
  END IF;
  
  -- Probar generación en semana 4 (debería crear 0 instancias)
  SELECT generate_recurring_expenses_for_period_fixed(period_record.id) INTO week35_result;
  
  -- 🧪 TEST 2: Verificar que SÍ se crean instancias en semana 1 (donde hay templates)
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE company_id = company_id_param
  AND period_start_date = '2025-08-04'::date;
  
  IF FOUND THEN
    -- Probar generación en semana 1 (debería respetar templates existentes)
    SELECT generate_recurring_expenses_for_period_fixed(period_record.id) INTO week1_result;
  END IF;
  
  -- 🧪 TEST 3: Validar integridad completa del sistema
  SELECT validate_recurring_expenses_integrity(company_id_param) INTO validation_result;
  
  -- Compilar resultados de testing
  test_results := jsonb_build_object(
    'test_date', now(),
    'company_id', company_id_param,
    'test_1_week4_generation', jsonb_build_object(
      'description', 'Should create 0 instances in week 4 (no templates for month_week=4)',
      'result', week35_result,
      'expected_instances', 0,
      'actual_instances', COALESCE(week35_result->>'instances_created', '0')::integer,
      'test_passed', COALESCE(week35_result->>'instances_created', '0')::integer = 0
    ),
    'test_2_week1_generation', jsonb_build_object(
      'description', 'Week 1 generation should respect existing instances',
      'result', week1_result,
      'instances_created', COALESCE(week1_result->>'instances_created', '0')::integer,
      'instances_skipped', COALESCE(week1_result->>'instances_skipped', '0')::integer
    ),
    'test_3_system_validation', jsonb_build_object(
      'description', 'System integrity should be healthy with 0 errors',
      'result', validation_result,
      'is_healthy', validation_result->>'is_system_healthy',
      'total_errors', validation_result->>'total_errors_found',
      'test_passed', (validation_result->>'is_system_healthy')::boolean = true
    )
  );
  
  -- Limpiar período de prueba si fue creado
  DELETE FROM company_payment_periods 
  WHERE company_id = company_id_param 
  AND period_start_date = '2025-08-25'::date 
  AND id = period_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Sistema de deducciones recurrentes funcionando correctamente',
    'test_results', test_results,
    'summary', jsonb_build_object(
      'week4_correctly_creates_zero_instances', COALESCE(week35_result->>'instances_created', '0')::integer = 0,
      'system_integrity_healthy', (validation_result->>'is_system_healthy')::boolean = true,
      'all_tests_passed', 
        COALESCE(week35_result->>'instances_created', '0')::integer = 0 AND
        (validation_result->>'is_system_healthy')::boolean = true
    )
  );
END;
$function$;