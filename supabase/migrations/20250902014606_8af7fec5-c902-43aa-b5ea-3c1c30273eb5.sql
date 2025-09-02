-- ===============================================
-- 🚨 SISTEMA AUTOMÁTICO DE DEDUCCIONES POR PORCENTAJES v1.0
-- ⚠️ Genera automáticamente expense_instances cuando se crean cargas con porcentajes
-- ===============================================

-- Función para crear automáticamente deducciones por porcentajes de cargas
CREATE OR REPLACE FUNCTION public.create_load_percentage_deductions(
  load_id_param UUID,
  driver_user_id_param UUID,
  payment_period_id_param UUID,
  total_amount_param NUMERIC,
  factoring_percentage_param NUMERIC DEFAULT 0,
  dispatching_percentage_param NUMERIC DEFAULT 0,
  leasing_percentage_param NUMERIC DEFAULT 0,
  operation_type TEXT DEFAULT 'CREATE'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  factoring_type_id UUID;
  dispatching_type_id UUID;
  leasing_type_id UUID;
  driver_calc_id UUID;
  deductions_created INTEGER := 0;
  result_details JSONB := '[]'::jsonb;
BEGIN
  -- Verificar usuario autenticado
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Log de inicio
  RAISE NOTICE 'Iniciando creación de deducciones para carga %, conductor %, período %', 
    load_id_param, driver_user_id_param, payment_period_id_param;

  -- Si es UPDATE, primero eliminar deducciones existentes de esta carga
  IF operation_type = 'UPDATE' THEN
    DELETE FROM expense_instances 
    WHERE payment_period_id IN (
      SELECT dpc.id FROM driver_period_calculations dpc 
      WHERE dpc.company_payment_period_id = (
        SELECT cpp.id FROM company_payment_periods cpp 
        JOIN driver_period_calculations dpc2 ON cpp.id = dpc2.company_payment_period_id 
        WHERE dpc2.driver_user_id = driver_user_id_param
      )
    )
    AND created_by = current_user_id
    AND notes LIKE '%Load #%' || (SELECT load_number FROM loads WHERE id = load_id_param) || '%';

    RAISE NOTICE 'Deducciones existentes eliminadas para actualización de carga %', load_id_param;
  END IF;

  -- Obtener IDs de los tipos de expenses por porcentaje
  SELECT id INTO factoring_type_id 
  FROM expense_types 
  WHERE name = 'Factoring Fee' AND category = 'percentage_deduction' AND is_active = true;

  SELECT id INTO dispatching_type_id 
  FROM expense_types 
  WHERE name = 'Dispatching Fee' AND category = 'percentage_deduction' AND is_active = true;

  SELECT id INTO leasing_type_id 
  FROM expense_types 
  WHERE name = 'Leasing Fee' AND category = 'percentage_deduction' AND is_active = true;

  -- Verificar que existen los tipos de expense necesarios
  IF factoring_type_id IS NULL OR dispatching_type_id IS NULL OR leasing_type_id IS NULL THEN
    RAISE EXCEPTION 'No se encontraron todos los tipos de expense necesarios (Factoring Fee, Dispatching Fee, Leasing Fee)';
  END IF;

  -- Obtener el driver_period_calculation del conductor para este período
  SELECT dpc.id INTO driver_calc_id
  FROM driver_period_calculations dpc
  JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
  WHERE cpp.id = payment_period_id_param 
    AND dpc.driver_user_id = driver_user_id_param;

  IF driver_calc_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró el cálculo del período para el conductor %', driver_user_id_param;
  END IF;

  -- Crear deducción por Factoring si aplica
  IF factoring_percentage_param > 0 THEN
    DECLARE
      factoring_amount NUMERIC := ROUND((total_amount_param * factoring_percentage_param / 100), 2);
    BEGIN
      INSERT INTO expense_instances (
        user_id,
        payment_period_id,
        expense_type_id,
        amount,
        description,
        notes,
        expense_date,
        status,
        applied_at,
        applied_by,
        created_by
      ) VALUES (
        driver_user_id_param,
        driver_calc_id,
        factoring_type_id,
        factoring_amount,
        'Factoring fees',
        'Automatically generated from Load #' || (SELECT load_number FROM loads WHERE id = load_id_param) || ' (' || factoring_percentage_param || '% of $' || total_amount_param || ')',
        CURRENT_DATE,
        'applied',
        now(),
        current_user_id,
        current_user_id
      );
      
      deductions_created := deductions_created + 1;
      result_details := result_details || jsonb_build_object(
        'type', 'Factoring Fee',
        'percentage', factoring_percentage_param,
        'amount', factoring_amount
      );
      
      RAISE NOTICE 'Deducción de Factoring creada: $% (%%)', factoring_amount, factoring_percentage_param;
    END;
  END IF;

  -- Crear deducción por Dispatching si aplica
  IF dispatching_percentage_param > 0 THEN
    DECLARE
      dispatching_amount NUMERIC := ROUND((total_amount_param * dispatching_percentage_param / 100), 2);
    BEGIN
      INSERT INTO expense_instances (
        user_id,
        payment_period_id,
        expense_type_id,
        amount,
        description,
        notes,
        expense_date,
        status,
        applied_at,
        applied_by,
        created_by
      ) VALUES (
        driver_user_id_param,
        driver_calc_id,
        dispatching_type_id,
        dispatching_amount,
        'Dispatching fees',
        'Automatically generated from Load #' || (SELECT load_number FROM loads WHERE id = load_id_param) || ' (' || dispatching_percentage_param || '% of $' || total_amount_param || ')',
        CURRENT_DATE,
        'applied',
        now(),
        current_user_id,
        current_user_id
      );
      
      deductions_created := deductions_created + 1;
      result_details := result_details || jsonb_build_object(
        'type', 'Dispatching Fee',
        'percentage', dispatching_percentage_param,
        'amount', dispatching_amount
      );
      
      RAISE NOTICE 'Deducción de Dispatching creada: $% (%%)', dispatching_amount, dispatching_percentage_param;
    END;
  END IF;

  -- Crear deducción por Leasing si aplica
  IF leasing_percentage_param > 0 THEN
    DECLARE
      leasing_amount NUMERIC := ROUND((total_amount_param * leasing_percentage_param / 100), 2);
    BEGIN
      INSERT INTO expense_instances (
        user_id,
        payment_period_id,
        expense_type_id,
        amount,
        description,
        notes,
        expense_date,
        status,
        applied_at,
        applied_by,
        created_by
      ) VALUES (
        driver_user_id_param,
        driver_calc_id,
        leasing_type_id,
        leasing_amount,
        'Leasing fees',
        'Automatically generated from Load #' || (SELECT load_number FROM loads WHERE id = load_id_param) || ' (' || leasing_percentage_param || '% of $' || total_amount_param || ')',
        CURRENT_DATE,
        'applied',
        now(),
        current_user_id,
        current_user_id
      );
      
      deductions_created := deductions_created + 1;
      result_details := result_details || jsonb_build_object(
        'type', 'Leasing Fee',
        'percentage', leasing_percentage_param,
        'amount', leasing_amount
      );
      
      RAISE NOTICE 'Deducción de Leasing creada: $% (%%)', leasing_amount, leasing_percentage_param;
    END;
  END IF;

  -- Retornar resultado
  RETURN jsonb_build_object(
    'success', true,
    'deductions_created', deductions_created,
    'load_id', load_id_param,
    'driver_user_id', driver_user_id_param,
    'total_amount', total_amount_param,
    'deductions_detail', result_details,
    'created_by', current_user_id,
    'created_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error creando deducciones por porcentajes: %', SQLERRM;
END;
$function$;

-- Función mejorada para operaciones de carga que incluye generación automática de deducciones
CREATE OR REPLACE FUNCTION public.simple_load_operation_with_deductions(
  operation_type text, 
  load_data jsonb, 
  stops_data jsonb[] DEFAULT '{}'::jsonb[], 
  load_id_param uuid DEFAULT NULL::uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  result_load RECORD;
  result_stops JSONB[] := '{}';
  stop_data JSONB;
  stop_result JSONB;
  payment_period_id_result UUID;
  load_pickup_date DATE;
  load_status TEXT;
  deductions_result JSONB;
  final_load_id UUID;
BEGIN
  -- Primero ejecutar la operación de carga normal usando la función existente
  DECLARE
    load_operation_result JSONB;
  BEGIN
    SELECT simple_load_operation(
      operation_type,
      load_data,
      stops_data,
      load_id_param
    ) INTO load_operation_result;

    -- Verificar que la operación fue exitosa
    IF NOT (load_operation_result->>'success')::boolean THEN
      RETURN load_operation_result;
    END IF;

    -- Obtener el ID de la carga creada/actualizada
    final_load_id := COALESCE(
      load_id_param, 
      (load_operation_result->'load'->>'id')::UUID
    );

    -- Obtener datos necesarios para las deducciones
    SELECT 
      l.driver_user_id,
      l.payment_period_id,
      l.total_amount,
      COALESCE(l.factoring_percentage, 0) as factoring_percentage,
      COALESCE(l.dispatching_percentage, 0) as dispatching_percentage,
      COALESCE(l.leasing_percentage, 0) as leasing_percentage
    INTO 
      current_user_id,
      payment_period_id_result,
      load_data,
      factoring_percentage,
      dispatching_percentage,
      leasing_percentage
    FROM loads l
    WHERE l.id = final_load_id;

    -- Generar deducciones automáticas si hay porcentajes configurados
    IF (factoring_percentage > 0 OR dispatching_percentage > 0 OR leasing_percentage > 0) 
       AND payment_period_id_result IS NOT NULL THEN
      
      RAISE NOTICE 'Generando deducciones automáticas para carga % con porcentajes F:% D:% L:%', 
        final_load_id, factoring_percentage, dispatching_percentage, leasing_percentage;

      SELECT create_load_percentage_deductions(
        final_load_id,
        current_user_id,
        payment_period_id_result,
        (load_data->>'total_amount')::NUMERIC,
        factoring_percentage,
        dispatching_percentage,
        leasing_percentage,
        operation_type
      ) INTO deductions_result;

      -- Agregar información de deducciones al resultado
      load_operation_result := load_operation_result || jsonb_build_object(
        'automatic_deductions', deductions_result
      );
    END IF;

    RETURN load_operation_result;
  END;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación de carga con deducciones: %', SQLERRM;
END;
$function$;