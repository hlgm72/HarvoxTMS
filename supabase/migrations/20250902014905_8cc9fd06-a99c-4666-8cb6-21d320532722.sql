-- Función wrapper que usa la función principal y luego genera deducciones automáticas
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
  load_operation_result JSONB;
  final_load_id UUID;
  load_info RECORD;
  deductions_result JSONB;
BEGIN
  -- Primero ejecutar la operación de carga normal
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

  -- Obtener datos de la carga para verificar porcentajes
  SELECT 
    l.driver_user_id,
    l.payment_period_id,
    l.total_amount,
    COALESCE(l.factoring_percentage, 0) as factoring_percentage,
    COALESCE(l.dispatching_percentage, 0) as dispatching_percentage,
    COALESCE(l.leasing_percentage, 0) as leasing_percentage
  INTO load_info
  FROM loads l
  WHERE l.id = final_load_id;

  -- Generar deducciones automáticas si hay porcentajes configurados y hay período de pago
  IF (load_info.factoring_percentage > 0 OR 
      load_info.dispatching_percentage > 0 OR 
      load_info.leasing_percentage > 0) 
     AND load_info.payment_period_id IS NOT NULL THEN

    SELECT create_load_percentage_deductions(
      final_load_id,
      load_info.driver_user_id,
      load_info.payment_period_id,
      load_info.total_amount,
      load_info.factoring_percentage,
      load_info.dispatching_percentage,
      load_info.leasing_percentage,
      operation_type
    ) INTO deductions_result;

    -- Agregar información de deducciones al resultado
    load_operation_result := load_operation_result || jsonb_build_object(
      'automatic_deductions', deductions_result
    );
  END IF;

  RETURN load_operation_result;

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación de carga con deducciones automáticas: %', SQLERRM;
END;
$function$;