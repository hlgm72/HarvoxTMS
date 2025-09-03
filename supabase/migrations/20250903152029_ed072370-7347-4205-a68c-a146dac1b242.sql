-- =====================================================
-- 🚨 ARREGLO DEFINITIVO DE TIMEOUT Y CASCADAS v4.4
-- =====================================================

-- 1. Actualizar función de operación de cargas para usar la v3 optimizada
CREATE OR REPLACE FUNCTION public.simple_load_operation_with_deductions(
  load_data JSONB,
  percentage_calculation_data JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  target_company_id UUID;
  result_load RECORD;
  operation_type TEXT;
  target_payment_period_id UUID;
  target_driver_user_id UUID;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_AUTHENTICATED';
  END IF;

  -- Extract operation details
  operation_type := load_data->>'mode';
  target_driver_user_id := (load_data->>'driver_user_id')::UUID;

  -- Get company from user roles
  SELECT company_id INTO target_company_id
  FROM user_company_roles
  WHERE user_id = current_user_id
  AND is_active = true
  LIMIT 1;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'ERROR_USER_NOT_IN_COMPANY';
  END IF;

  -- For new loads, ensure payment period exists
  IF operation_type = 'create' AND target_driver_user_id IS NOT NULL THEN
    target_payment_period_id := create_payment_period_if_needed(
      target_company_id, 
      COALESCE((load_data->>'delivery_date')::DATE, CURRENT_DATE)
    );
  ELSIF operation_type = 'edit' THEN
    -- For existing loads, keep current period or find the right one
    SELECT payment_period_id INTO target_payment_period_id
    FROM loads
    WHERE id = (load_data->>'id')::UUID;
  END IF;

  -- Create or update load
  IF operation_type = 'create' THEN
    INSERT INTO loads (
      company_id, load_number, po_number, client_id, client_contact_id,
      driver_user_id, internal_dispatcher_id, total_amount, commodity,
      weight_lbs, notes, currency, payment_period_id, created_by,
      factoring_percentage, dispatching_percentage, leasing_percentage,
      pickup_date, delivery_date
    ) VALUES (
      target_company_id,
      load_data->>'load_number',
      NULLIF(load_data->>'po_number', ''),
      NULLIF(load_data->>'client_id', '')::UUID,
      NULLIF(load_data->>'client_contact_id', '')::UUID,
      target_driver_user_id,
      NULLIF(load_data->>'internal_dispatcher_id', '')::UUID,
      (load_data->>'total_amount')::NUMERIC,
      load_data->>'commodity',
      (load_data->>'weight_lbs')::INTEGER,
      NULLIF(load_data->>'notes', ''),
      'USD',
      target_payment_period_id,
      current_user_id,
      (percentage_calculation_data->>'factoring_percentage')::NUMERIC,
      (percentage_calculation_data->>'dispatching_percentage')::NUMERIC,
      (percentage_calculation_data->>'leasing_percentage')::NUMERIC,
      COALESCE((load_data->>'pickup_date')::DATE, CURRENT_DATE),
      COALESCE((load_data->>'delivery_date')::DATE, CURRENT_DATE)
    ) RETURNING * INTO result_load;
  ELSE
    UPDATE loads SET
      load_number = COALESCE(load_data->>'load_number', load_number),
      total_amount = COALESCE((load_data->>'total_amount')::NUMERIC, total_amount),
      commodity = COALESCE(load_data->>'commodity', commodity),
      weight_lbs = COALESCE((load_data->>'weight_lbs')::INTEGER, weight_lbs),
      notes = COALESCE(NULLIF(load_data->>'notes', ''), notes),
      driver_user_id = COALESCE(target_driver_user_id, driver_user_id),
      internal_dispatcher_id = COALESCE(NULLIF(load_data->>'internal_dispatcher_id', '')::UUID, internal_dispatcher_id),
      client_id = COALESCE(NULLIF(load_data->>'client_id', '')::UUID, client_id),
      client_contact_id = COALESCE(NULLIF(load_data->>'client_contact_id', '')::UUID, client_contact_id),
      factoring_percentage = COALESCE((percentage_calculation_data->>'factoring_percentage')::NUMERIC, factoring_percentage),
      dispatching_percentage = COALESCE((percentage_calculation_data->>'dispatching_percentage')::NUMERIC, dispatching_percentage),
      leasing_percentage = COALESCE((percentage_calculation_data->>'leasing_percentage')::NUMERIC, leasing_percentage),
      updated_at = now()
    WHERE id = (load_data->>'id')::UUID
    RETURNING * INTO result_load;
  END IF;

  -- 🚀 RECÁLCULO OPTIMIZADO: Solo si hay conductor asignado, usar v3
  IF target_driver_user_id IS NOT NULL AND target_payment_period_id IS NOT NULL THEN
    -- Usar la función v3 optimizada que no causa timeout
    PERFORM auto_recalculate_driver_payment_period_v3(target_driver_user_id, target_payment_period_id);
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'load', row_to_json(result_load),
    'payment_period_id', target_payment_period_id,
    'recalculation_triggered', target_driver_user_id IS NOT NULL,
    'processed_by', current_user_id
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'ERROR_LOAD_OPERATION_FAILED: %', SQLERRM;
END;
$function$;

-- 2. Arreglar el trigger de expense_instances para evitar cascadas
CREATE OR REPLACE FUNCTION public.auto_recalculate_on_expense_instances()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  target_driver_user_id UUID;
  target_period_id UUID;
BEGIN
  -- 🚨 ANTI-CASCADA: Verificar que no hay recálculo reciente
  IF EXISTS (
    SELECT 1 FROM pg_stat_activity 
    WHERE state = 'active' 
    AND query LIKE '%auto_recalculate%'
    AND backend_start > now() - interval '2 seconds'
    AND pid != pg_backend_pid()
  ) THEN
    RAISE NOTICE '⚠️ ANTI-CASCADE: Saltando recálculo para evitar cascada';
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Obtener datos del trigger
  IF TG_OP = 'DELETE' THEN
    target_driver_user_id := OLD.user_id;
    target_period_id := OLD.payment_period_id;
  ELSE
    target_driver_user_id := NEW.user_id;
    target_period_id := NEW.payment_period_id;
  END IF;

  -- 🚀 RECÁLCULO SEGURO: Usar v3 optimizada
  BEGIN
    PERFORM auto_recalculate_driver_payment_period_v3(target_driver_user_id, target_period_id);
    RAISE NOTICE 'auto_recalculate_on_expense_instances: Recálculo v3 OPTIMIZADO ejecutado para conductor % en período %', target_driver_user_id, target_period_id;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'auto_recalculate_on_expense_instances: Error en recálculo v3: %', SQLERRM;
  END;

  RETURN COALESCE(NEW, OLD);
END;
$function$;