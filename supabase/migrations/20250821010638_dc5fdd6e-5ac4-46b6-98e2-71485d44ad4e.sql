-- Actualizar la función para usar lógica basada en lunes específicos del mes
CREATE OR REPLACE FUNCTION public.generate_recurring_expenses_for_period(
  period_id UUID
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  period_rec RECORD;
  template_rec RECORD;
  expense_date DATE;
  current_user_id UUID;
  expenses_created INTEGER := 0;
  target_monday DATE;
  month_start DATE;
  first_monday DATE;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Obtener información del período de pago
  SELECT cpp.*, c.id as company_id
  INTO period_rec
  FROM company_payment_periods cpp
  JOIN companies c ON cpp.company_id = c.id
  WHERE cpp.id = period_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Período de pago no encontrado';
  END IF;

  -- Obtener plantillas activas para conductores de la empresa
  FOR template_rec IN
    SELECT ert.*, dp.user_id
    FROM expense_recurring_templates ert
    JOIN driver_profiles dp ON ert.user_id = dp.user_id
    JOIN user_company_roles ucr ON dp.user_id = ucr.user_id
    WHERE ucr.company_id = period_rec.company_id
    AND ucr.is_active = true
    AND ucr.role IN ('driver', 'dispatcher')
    AND ert.is_active = true
    AND ert.start_date <= period_rec.period_end_date
    AND (ert.end_date IS NULL OR ert.end_date >= period_rec.period_start_date)
  LOOP
    expense_date := NULL;

    -- Lógica según frecuencia
    CASE template_rec.frequency
      WHEN 'weekly' THEN
        -- Para semanal, aplicar cada semana del período
        expense_date := period_rec.period_end_date;

      WHEN 'biweekly' THEN
        -- Para quincenal, determinar si aplica en esta quincena
        month_start := DATE_TRUNC('month', period_rec.period_start_date)::DATE;
        
        -- Primera quincena: días 1-15
        IF period_rec.period_start_date <= month_start + INTERVAL '14 days' 
           AND period_rec.period_end_date >= month_start THEN
          expense_date := LEAST(month_start + INTERVAL '14 days', period_rec.period_end_date)::DATE;
        
        -- Segunda quincena: día 16 en adelante
        ELSIF period_rec.period_start_date <= (month_start + INTERVAL '1 month' - INTERVAL '1 day')::DATE
              AND period_rec.period_end_date >= month_start + INTERVAL '15 days' THEN
          expense_date := period_rec.period_end_date;
        END IF;

      WHEN 'monthly' THEN
        -- Nueva lógica: basada en lunes específicos del mes
        month_start := DATE_TRUNC('month', period_rec.period_start_date)::DATE;
        
        -- Encontrar el primer lunes del mes
        first_monday := month_start;
        WHILE EXTRACT(DOW FROM first_monday) != 1 LOOP
          first_monday := first_monday + INTERVAL '1 day';
        END LOOP;
        
        -- Calcular el lunes objetivo según month_week
        IF template_rec.month_week = 1 THEN
          target_monday := first_monday;
        ELSIF template_rec.month_week = 2 THEN
          target_monday := first_monday + INTERVAL '7 days';
        ELSIF template_rec.month_week = 3 THEN
          target_monday := first_monday + INTERVAL '14 days';
        ELSIF template_rec.month_week = 4 THEN
          target_monday := first_monday + INTERVAL '21 days';
        ELSE
          -- Si no se especifica semana válida, usar el último día del período
          target_monday := NULL;
        END IF;

        -- Verificar si el lunes objetivo cae dentro del período actual y del mes
        IF target_monday IS NOT NULL 
           AND target_monday >= period_rec.period_start_date 
           AND target_monday <= period_rec.period_end_date
           AND EXTRACT(MONTH FROM target_monday) = EXTRACT(MONTH FROM month_start) THEN
          expense_date := target_monday;
        END IF;

    END CASE;

    -- Crear la instancia de gasto si se determinó una fecha
    IF expense_date IS NOT NULL THEN
      INSERT INTO expense_instances (
        user_id,
        payment_period_id,
        expense_type_id,
        recurring_template_id,
        amount,
        expense_date,
        description,
        notes,
        priority,
        is_critical,
        status,
        created_by,
        applied_to_role
      ) VALUES (
        template_rec.user_id,
        period_id,
        template_rec.expense_type_id,
        template_rec.id,
        template_rec.amount,
        expense_date,
        'Deducción recurrente generada automáticamente',
        template_rec.notes,
        5, -- Prioridad normal
        false, -- No crítico por defecto
        'planned',
        current_user_id,
        template_rec.applied_to_role
      )
      ON CONFLICT (user_id, payment_period_id, expense_type_id, recurring_template_id) 
      DO NOTHING;
      
      -- Incrementar contador solo si se insertó
      IF FOUND THEN
        expenses_created := expenses_created + 1;
      END IF;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'expenses_created', expenses_created,
    'period_id', period_id,
    'message', format('Se generaron %s deducciones recurrentes para el período', expenses_created)
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error generando deducciones recurrentes: %', SQLERRM;
END;
$$;