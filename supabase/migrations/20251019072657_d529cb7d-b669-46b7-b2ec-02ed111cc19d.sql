-- ============================================================================
-- FIX DEFINITIVO: Evitar conflicto con is_active en SELECT
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_or_update_expense_template_with_validation(jsonb, uuid);

CREATE FUNCTION public.create_or_update_expense_template_with_validation(
  template_data jsonb, 
  template_id uuid DEFAULT NULL
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
  old_amount NUMERIC;
  previous_is_active BOOLEAN;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  target_user_id := (template_data->>'user_id')::UUID;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'user_id es requerido';
  END IF;

  IF (template_data->>'expense_type_id') IS NULL THEN
    RAISE EXCEPTION 'expense_type_id es requerido';
  END IF;

  IF (template_data->>'amount') IS NULL THEN
    RAISE EXCEPTION 'amount es requerido';
  END IF;

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

  operation_type := CASE WHEN template_id IS NULL THEN 'CREATE' ELSE 'UPDATE' END;
  
  IF operation_type = 'CREATE' THEN
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

    -- ✅ Capturar valores anteriores con SELECTs separados
    SELECT amount, is_active INTO old_amount, previous_is_active
    FROM expense_recurring_templates 
    WHERE id = template_id;

    IF old_amount != (template_data->>'amount')::NUMERIC THEN
      INSERT INTO expense_template_history (
        template_id,
        previous_amount,
        new_amount,
        effective_from,
        change_reason,
        changed_by
      ) VALUES (
        template_id,
        old_amount,
        (template_data->>'amount')::NUMERIC,
        COALESCE((template_data->>'start_date')::DATE, CURRENT_DATE),
        COALESCE(template_data->>'change_reason', 'Actualización de monto'),
        current_user_id
      );
    END IF;

    -- ✅ Usar la variable local previamente capturada
    UPDATE expense_recurring_templates SET
      expense_type_id = (template_data->>'expense_type_id')::UUID,
      amount = (template_data->>'amount')::NUMERIC,
      frequency = template_data->>'frequency',
      start_date = (template_data->>'start_date')::DATE,
      end_date = NULLIF((template_data->>'end_date'), '')::DATE,
      month_week = NULLIF((template_data->>'month_week'), '')::INTEGER,
      notes = NULLIF(template_data->>'notes', ''),
      applied_to_role = NULLIF((template_data->>'applied_to_role'), '')::user_role,
      is_active = COALESCE((template_data->>'is_active')::BOOLEAN, previous_is_active),
      updated_at = now()
    WHERE id = template_id
    RETURNING * INTO template_result;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'operation', operation_type,
    'message', CASE WHEN operation_type = 'CREATE' THEN 'Plantilla creada exitosamente' ELSE 'Plantilla actualizada exitosamente' END,
    'template', row_to_json(template_result),
    'created_by', current_user_id::TEXT,
    'processed_at', now()::TEXT
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error en operación ACID de plantilla: %', SQLERRM;
END;
$function$;