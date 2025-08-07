-- ACID RPC: Mark multiple drivers as paid in a single transaction
CREATE OR REPLACE FUNCTION public.mark_multiple_drivers_as_paid_with_validation(
  calculation_ids UUID[],
  payment_method_used TEXT DEFAULT NULL,
  payment_ref TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  calculation_record RECORD;
  success_count INTEGER := 0;
  error_count INTEGER := 0;
  errors JSONB := '[]'::jsonb;
  period_id UUID;
  company_id UUID;
  current_user_id UUID;
  can_close_result JSONB;
BEGIN
  -- Verificar autenticación
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Validar que tenemos IDs para procesar
  IF calculation_ids IS NULL OR array_length(calculation_ids, 1) = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No se proporcionaron cálculos para procesar'
    );
  END IF;

  -- Iniciar transacción implícita (función es atómica)
  
  -- Procesar cada cálculo en la transacción
  FOR calculation_record IN
    SELECT dpc.*, cpp.company_id, cpp.is_locked
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE dpc.id = ANY(calculation_ids)
  LOOP
    BEGIN
      -- Verificar que el usuario tiene permisos para esta empresa
      IF NOT EXISTS (
        SELECT 1 FROM user_company_roles
        WHERE user_id = current_user_id
        AND company_id = calculation_record.company_id
        AND role IN ('company_owner', 'operations_manager', 'superadmin')
        AND is_active = true
      ) THEN
        errors := errors || jsonb_build_object(
          'calculation_id', calculation_record.id,
          'error', 'Sin permisos para esta empresa'
        );
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      -- Verificar que el período no esté bloqueado
      IF calculation_record.is_locked THEN
        errors := errors || jsonb_build_object(
          'calculation_id', calculation_record.id,
          'error', 'Período bloqueado'
        );
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      -- Verificar que no esté ya pagado
      IF calculation_record.payment_status = 'paid' THEN
        errors := errors || jsonb_build_object(
          'calculation_id', calculation_record.id,
          'error', 'Ya está marcado como pagado'
        );
        error_count := error_count + 1;
        CONTINUE;
      END IF;

      -- Marcar como pagado
      UPDATE driver_period_calculations
      SET 
        payment_status = 'paid',
        paid_at = now(),
        paid_by = current_user_id,
        payment_method = payment_method_used,
        payment_reference = payment_ref,
        payment_notes = notes,
        updated_at = now()
      WHERE id = calculation_record.id;
      
      success_count := success_count + 1;
      period_id := calculation_record.company_payment_period_id;

    EXCEPTION WHEN OTHERS THEN
      errors := errors || jsonb_build_object(
        'calculation_id', calculation_record.id,
        'error', SQLERRM
      );
      error_count := error_count + 1;
    END;
  END LOOP;

  -- Si hay errores críticos, fallar toda la transacción
  IF success_count = 0 AND error_count > 0 THEN
    RAISE EXCEPTION 'No se pudieron procesar ninguno de los pagos: %', errors::text;
  END IF;

  -- Intentar cerrar el período automáticamente si todos los pagos están completos
  IF success_count > 0 AND period_id IS NOT NULL THEN
    BEGIN
      SELECT can_close_payment_period(period_id) INTO can_close_result;
      
      IF (can_close_result->>'can_close')::BOOLEAN THEN
        UPDATE company_payment_periods
        SET 
          status = 'closed',
          is_locked = true,
          locked_at = now(),
          locked_by = current_user_id,
          updated_at = now()
        WHERE id = period_id;
        
        RAISE NOTICE 'Período % cerrado automáticamente', period_id;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- No fallar la transacción por error de cierre automático
      RAISE NOTICE 'Error al cerrar período automáticamente: %', SQLERRM;
    END;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', format('Procesados %s pagos exitosamente, %s errores', success_count, error_count),
    'success_count', success_count,
    'error_count', error_count,
    'errors', errors,
    'period_closed', can_close_result->>'can_close',
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  -- Rollback automático en funciones PL/pgSQL
  RAISE EXCEPTION 'Error en procesamiento ACID de pagos múltiples: %', SQLERRM;
END;
$function$;

-- ACID RPC: Create or update expense template with validation
CREATE OR REPLACE FUNCTION public.create_or_update_expense_template_with_validation(
  template_data JSONB,
  template_id UUID DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  target_user_id UUID;
  template_result RECORD;
  current_user_id UUID;
  operation_type TEXT;
  history_record RECORD;
BEGIN
  -- Verificar autenticación
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  target_user_id := (template_data->>'user_id')::UUID;
  
  -- Validar datos requeridos
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id es requerido';
  END IF;

  IF (template_data->>'expense_type_id') IS NULL THEN
    RAISE EXCEPTION 'expense_type_id es requerido';
  END IF;

  IF (template_data->>'amount') IS NULL THEN
    RAISE EXCEPTION 'amount es requerido';
  END IF;

  -- Verificar permisos: debe ser admin en la misma empresa que el usuario objetivo
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr1
    JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
    WHERE ucr1.user_id = current_user_id
    AND ucr2.user_id = target_user_id
    AND ucr1.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr1.is_active = true
    AND ucr2.is_active = true
  ) AND current_user_id != target_user_id THEN
    RAISE EXCEPTION 'Sin permisos para gestionar plantillas de este usuario';
  END IF;

  -- Determinar tipo de operación
  operation_type := CASE WHEN template_id IS NULL THEN 'CREATE' ELSE 'UPDATE' END;

  -- Iniciar transacción implícita
  
  IF operation_type = 'CREATE' THEN
    -- Crear nueva plantilla
    INSERT INTO expense_recurring_templates (
      user_id,
      expense_type_id,
      amount,
      frequency,
      start_date,
      end_date,
      month_week,
      notes,
      applied_to_role,
      created_by,
      is_active
    ) VALUES (
      target_user_id,
      (template_data->>'expense_type_id')::UUID,
      (template_data->>'amount')::NUMERIC,
      template_data->>'frequency',
      (template_data->>'start_date')::DATE,
      NULLIF((template_data->>'end_date'), '')::DATE,
      NULLIF((template_data->>'month_week'), '')::INTEGER,
      NULLIF(template_data->>'notes', ''),
      NULLIF((template_data->>'applied_to_role'), '')::user_role,
      current_user_id,
      COALESCE((template_data->>'is_active')::BOOLEAN, true)
    ) RETURNING * INTO template_result;
    
  ELSE
    -- Verificar que la plantilla existe y el usuario tiene permisos
    IF NOT EXISTS (
      SELECT 1 FROM expense_recurring_templates ert
      JOIN user_company_roles ucr1 ON ert.user_id = ucr1.user_id
      JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
      WHERE ert.id = template_id
      AND ucr2.user_id = current_user_id
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr1.is_active = true
      AND ucr2.is_active = true
    ) THEN
      RAISE EXCEPTION 'Plantilla no encontrada o sin permisos';
    END IF;

    -- Registrar cambio en historial si el monto cambió
    SELECT * INTO history_record
    FROM expense_recurring_templates 
    WHERE id = template_id;

    IF history_record.amount != (template_data->>'amount')::NUMERIC THEN
      INSERT INTO expense_template_history (
        template_id,
        previous_amount,
        new_amount,
        effective_from,
        change_reason,
        changed_by
      ) VALUES (
        template_id,
        history_record.amount,
        (template_data->>'amount')::NUMERIC,
        COALESCE((template_data->>'start_date')::DATE, CURRENT_DATE),
        COALESCE(template_data->>'change_reason', 'Actualización de monto'),
        current_user_id
      );
    END IF;

    -- Actualizar plantilla
    UPDATE expense_recurring_templates SET
      expense_type_id = (template_data->>'expense_type_id')::UUID,
      amount = (template_data->>'amount')::NUMERIC,
      frequency = template_data->>'frequency',
      start_date = (template_data->>'start_date')::DATE,
      end_date = NULLIF((template_data->>'end_date'), '')::DATE,
      month_week = NULLIF((template_data->>'month_week'), '')::INTEGER,
      notes = NULLIF(template_data->>'notes', ''),
      applied_to_role = NULLIF((template_data->>'applied_to_role'), '')::user_role,
      is_active = COALESCE((template_data->>'is_active')::BOOLEAN, is_active),
      updated_at = now()
    WHERE id = template_id
    RETURNING * INTO template_result;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', CASE operation_type 
      WHEN 'CREATE' THEN 'Plantilla de deducción creada exitosamente'
      ELSE 'Plantilla de deducción actualizada exitosamente'
    END,
    'template', row_to_json(template_result),
    'created_by', current_user_id,
    'processed_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  -- Rollback automático
  RAISE EXCEPTION 'Error en operación ACID de plantilla: %', SQLERRM;
END;
$function$;

-- ACID RPC: Deactivate expense template with validation
CREATE OR REPLACE FUNCTION public.deactivate_expense_template_with_validation(
  template_id UUID,
  deactivation_reason TEXT DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  template_record RECORD;
  current_user_id UUID;
BEGIN
  -- Verificar autenticación
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Obtener información de la plantilla y verificar permisos
  SELECT ert.*, ucr.company_id INTO template_record
  FROM expense_recurring_templates ert
  JOIN user_company_roles ucr ON ert.user_id = ucr.user_id
  WHERE ert.id = template_id
  AND ucr.is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Plantilla no encontrada';
  END IF;

  -- Verificar permisos del usuario actual
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = current_user_id
    AND company_id = template_record.company_id
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para desactivar esta plantilla';
  END IF;

  -- Verificar si ya está inactiva
  IF NOT template_record.is_active THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'La plantilla ya está desactivada'
    );
  END IF;

  -- Desactivar plantilla
  UPDATE expense_recurring_templates
  SET 
    is_active = false,
    end_date = CURRENT_DATE,
    notes = CASE 
      WHEN notes IS NULL THEN deactivation_reason
      ELSE notes || ' | Desactivada: ' || COALESCE(deactivation_reason, 'Sin razón especificada')
    END,
    updated_at = now()
  WHERE id = template_id;

  -- Registrar en historial
  INSERT INTO expense_template_history (
    template_id,
    previous_amount,
    new_amount,
    effective_from,
    change_reason,
    changed_by
  ) VALUES (
    template_id,
    template_record.amount,
    0,
    CURRENT_DATE,
    'Desactivación: ' || COALESCE(deactivation_reason, 'Sin razón especificada'),
    current_user_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Plantilla desactivada exitosamente',
    'template_id', template_id,
    'deactivated_by', current_user_id,
    'deactivated_at', now(),
    'reason', deactivation_reason
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error desactivando plantilla: %', SQLERRM;
END;
$function$;