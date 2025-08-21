-- Update the recurring expenses function to show proper description with expense type and notes
CREATE OR REPLACE FUNCTION public.generate_recurring_expenses_for_period_fixed(period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  period_record RECORD;
  template_record RECORD;
  driver_record RECORD;
  expense_type_record RECORD;
  should_apply BOOLEAN;
  target_date DATE;
  target_monday DATE;
  formatted_description TEXT;
  instances_created INTEGER := 0;
  instances_skipped INTEGER := 0;
  errors_encountered INTEGER := 0;
BEGIN
  -- Obtener información del período
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Período de pago no encontrado'
    );
  END IF;
  
  -- Obtener conductores activos de la empresa
  FOR driver_record IN 
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id = period_record.company_id 
    AND ucr.role = 'driver' 
    AND ucr.is_active = true
  LOOP
    -- Obtener plantillas activas para este conductor con información del tipo de gasto
    FOR template_record IN 
      SELECT ert.*, et.name as expense_type_name
      FROM expense_recurring_templates ert
      JOIN expense_types et ON ert.expense_type_id = et.id
      WHERE ert.user_id = driver_record.user_id
      AND ert.is_active = true
      AND ert.start_date <= period_record.period_end_date
      AND (ert.end_date IS NULL OR ert.end_date >= period_record.period_start_date)
    LOOP
      BEGIN
        should_apply := false;
        target_date := NULL;
        
        -- Formatear la descripción con tipo de gasto y notas
        IF template_record.notes IS NOT NULL AND TRIM(template_record.notes) != '' THEN
          formatted_description := template_record.expense_type_name || ' (' || template_record.notes || ')';
        ELSE
          formatted_description := template_record.expense_type_name;
        END IF;
        
        -- Determinar si el gasto aplica en este período según la frecuencia
        CASE template_record.frequency
          WHEN 'weekly' THEN
            -- Aplicar todas las semanas
            should_apply := true;
            target_date := period_record.period_end_date;
            
          WHEN 'biweekly' THEN
            -- Aplicar cada quincena del mes
            IF template_record.month_week = 1 THEN
              -- Primera quincena (días 1-15)
              IF EXTRACT(DAY FROM period_record.period_start_date) <= 15 
                 AND EXTRACT(DAY FROM period_record.period_end_date) >= 1 THEN
                -- Verificar que no existe ya para esta quincena
                IF NOT EXISTS (
                  SELECT 1 FROM expense_instances ei2
                  JOIN driver_period_calculations dpc2 ON ei2.payment_period_id = dpc2.id
                  JOIN company_payment_periods cpp2 ON dpc2.company_payment_period_id = cpp2.id
                  WHERE ei2.recurring_template_id = template_record.id
                  AND ei2.user_id = driver_record.user_id
                  AND cpp2.company_id = period_record.company_id
                  AND EXTRACT(MONTH FROM ei2.expense_date) = EXTRACT(MONTH FROM period_record.period_start_date)
                  AND EXTRACT(YEAR FROM ei2.expense_date) = EXTRACT(YEAR FROM period_record.period_start_date)
                  AND EXTRACT(DAY FROM ei2.expense_date) <= 15
                ) THEN
                  should_apply := true;
                  target_date := LEAST(
                    period_record.period_end_date,
                    DATE_TRUNC('month', period_record.period_start_date) + INTERVAL '14 days'
                  );
                END IF;
              END IF;
            ELSIF template_record.month_week = 2 THEN
              -- Segunda quincena (días 16-fin)
              IF EXTRACT(DAY FROM period_record.period_start_date) <= 31 
                 AND EXTRACT(DAY FROM period_record.period_end_date) >= 16 THEN
                -- Verificar que no existe ya para esta quincena
                IF NOT EXISTS (
                  SELECT 1 FROM expense_instances ei2
                  JOIN driver_period_calculations dpc2 ON ei2.payment_period_id = dpc2.id
                  JOIN company_payment_periods cpp2 ON dpc2.company_payment_period_id = cpp2.id
                  WHERE ei2.recurring_template_id = template_record.id
                  AND ei2.user_id = driver_record.user_id
                  AND cpp2.company_id = period_record.company_id
                  AND EXTRACT(MONTH FROM ei2.expense_date) = EXTRACT(MONTH FROM period_record.period_start_date)
                  AND EXTRACT(YEAR FROM ei2.expense_date) = EXTRACT(YEAR FROM period_record.period_start_date)
                  AND EXTRACT(DAY FROM ei2.expense_date) >= 16
                ) THEN
                  should_apply := true;
                  target_date := period_record.period_end_date;
                END IF;
              END IF;
            END IF;
            
          WHEN 'monthly' THEN
            -- Para gastos mensuales, usar lógica de lunes del mes
            IF template_record.month_week BETWEEN 1 AND 4 THEN
              -- Calcular el lunes correspondiente a la semana especificada
              -- Primer lunes del mes
              target_monday := DATE_TRUNC('month', period_record.period_start_date) + 
                              ((7 - EXTRACT(DOW FROM DATE_TRUNC('month', period_record.period_start_date)) + 1) % 7) * INTERVAL '1 day';
              
              -- Ajustar para la semana específica (1=primer lunes, 2=segundo lunes, etc.)
              target_monday := target_monday + ((template_record.month_week - 1) * 7) * INTERVAL '1 day';
              
              -- Verificar que el lunes calculado está en el mes correcto
              IF EXTRACT(MONTH FROM target_monday) = EXTRACT(MONTH FROM period_record.period_start_date) THEN
                target_date := target_monday;
                
                -- Verificar si esta fecha objetivo cae dentro del período actual
                IF target_date >= period_record.period_start_date AND target_date <= period_record.period_end_date THEN
                  -- Verificar que no existe ya una instancia para este mes
                  IF NOT EXISTS (
                    SELECT 1 FROM expense_instances ei2
                    JOIN driver_period_calculations dpc2 ON ei2.payment_period_id = dpc2.id
                    JOIN company_payment_periods cpp2 ON dpc2.company_payment_period_id = cpp2.id
                    WHERE ei2.recurring_template_id = template_record.id
                    AND ei2.user_id = driver_record.user_id
                    AND cpp2.company_id = period_record.company_id
                    AND EXTRACT(MONTH FROM ei2.expense_date) = EXTRACT(MONTH FROM target_date)
                    AND EXTRACT(YEAR FROM ei2.expense_date) = EXTRACT(YEAR FROM target_date)
                  ) THEN
                    should_apply := true;
                  ELSE
                    instances_skipped := instances_skipped + 1;
                  END IF;
                END IF;
              END IF;
            END IF;
        END CASE;
        
        -- Crear la instancia si debe aplicarse
        IF should_apply AND target_date IS NOT NULL THEN
          -- Verificar que no existe ya una instancia para esta plantilla en este período específico
          IF NOT EXISTS (
            SELECT 1 FROM expense_instances ei3
            JOIN driver_period_calculations dpc3 ON ei3.payment_period_id = dpc3.id
            WHERE ei3.recurring_template_id = template_record.id
            AND ei3.user_id = driver_record.user_id
            AND dpc3.company_payment_period_id = period_id
          ) THEN
            -- Buscar el driver_period_calculation para este conductor en este período
            DECLARE
              calculation_id UUID;
            BEGIN
              SELECT dpc.id INTO calculation_id
              FROM driver_period_calculations dpc
              WHERE dpc.driver_user_id = driver_record.user_id
              AND dpc.company_payment_period_id = period_id;
              
              IF calculation_id IS NOT NULL THEN
                INSERT INTO expense_instances (
                  user_id,
                  payment_period_id,
                  expense_type_id,
                  recurring_template_id,
                  amount,
                  expense_date,
                  description,
                  notes,
                  status,
                  applied_to_role
                ) VALUES (
                  driver_record.user_id,
                  calculation_id,
                  template_record.expense_type_id,
                  template_record.id,
                  template_record.amount,
                  target_date,
                  formatted_description,
                  template_record.notes,
                  'planned',
                  template_record.applied_to_role
                );
                
                instances_created := instances_created + 1;
              END IF;
            END;
          ELSE
            instances_skipped := instances_skipped + 1;
          END IF;
        END IF;
        
      EXCEPTION WHEN OTHERS THEN
        errors_encountered := errors_encountered + 1;
        -- Continue processing other templates
      END;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Generated %s instances, skipped %s duplicates, %s errors', 
                     instances_created, instances_skipped, errors_encountered),
    'instances_created', instances_created,
    'instances_skipped', instances_skipped,
    'errors_encountered', errors_encountered,
    'period_id', period_id
  );
END;
$function$;