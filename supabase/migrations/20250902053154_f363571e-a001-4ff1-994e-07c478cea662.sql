-- ARREGLAR el error de formato en la función
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
  should_apply BOOLEAN;
  target_date DATE;
  period_month_week INTEGER;
  formatted_description TEXT;
  instances_created INTEGER := 0;
  instances_skipped INTEGER := 0;
  validation_errors INTEGER := 0;
BEGIN
  -- Obtener información del período
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Período de pago no encontrado',
      'period_id', period_id
    );
  END IF;
  
  -- 🔥 CALCULAR QUÉ SEMANA DEL MES ES ESTE PERÍODO
  period_month_week := CASE 
    WHEN EXTRACT(DAY FROM period_record.period_start_date) BETWEEN 1 AND 7 THEN 1
    WHEN EXTRACT(DAY FROM period_record.period_start_date) BETWEEN 8 AND 14 THEN 2
    WHEN EXTRACT(DAY FROM period_record.period_start_date) BETWEEN 15 AND 21 THEN 3
    WHEN EXTRACT(DAY FROM period_record.period_start_date) BETWEEN 22 AND 28 THEN 4
    ELSE 5
  END;
  
  -- Log para debugging
  RAISE NOTICE 'Processing period % (% - %) - Month week: %', 
    period_id, period_record.period_start_date, period_record.period_end_date, period_month_week;
  
  -- Obtener conductores activos de la empresa
  FOR driver_record IN 
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id = period_record.company_id 
    AND ucr.role = 'driver' 
    AND ucr.is_active = true
  LOOP
    -- Obtener plantillas activas para este conductor
    FOR template_record IN 
      SELECT ert.*, et.name as expense_type_name
      FROM expense_recurring_templates ert
      JOIN expense_types et ON ert.expense_type_id = et.id
      WHERE ert.user_id = driver_record.user_id
      AND ert.is_active = true
      AND ert.start_date <= period_record.period_end_date
      AND (ert.end_date IS NULL OR ert.end_date >= period_record.period_start_date)
    LOOP
      should_apply := false;
      target_date := period_record.period_end_date;
      
      -- 🚨 LÓGICA CRÍTICA: Evaluar si la deducción aplica según frecuencia y semana
      CASE template_record.frequency
        WHEN 'weekly' THEN
          -- Aplicar todas las semanas
          should_apply := true;
          RAISE NOTICE 'Weekly template % applies to period %', template_record.id, period_id;
          
        WHEN 'biweekly' THEN
          -- Aplicar según quincena (1=primera quincena, 2=segunda quincena)
          IF (template_record.month_week = 1 AND period_month_week IN (1, 2)) OR
             (template_record.month_week = 2 AND period_month_week IN (3, 4, 5)) THEN
            should_apply := true;
            RAISE NOTICE 'Biweekly template % (month_week %) applies to period % (period_month_week %)', 
              template_record.id, template_record.month_week, period_id, period_month_week;
          ELSE
            RAISE NOTICE 'Biweekly template % (month_week %) SKIPPED for period % (period_month_week %)', 
              template_record.id, template_record.month_week, period_id, period_month_week;
          END IF;
          
        WHEN 'monthly' THEN
          -- 🔥 LÓGICA CRÍTICA: Solo aplicar si la semana del mes coincide EXACTAMENTE
          IF template_record.month_week = period_month_week THEN
            should_apply := true;
            RAISE NOTICE 'Monthly template % (month_week %) applies to period % (period_month_week %)', 
              template_record.id, template_record.month_week, period_id, period_month_week;
          ELSE
            RAISE NOTICE 'Monthly template % (month_week %) SKIPPED for period % (period_month_week %)', 
              template_record.id, template_record.month_week, period_id, period_month_week;
          END IF;
          
      END CASE;
      
      -- 🚨 VALIDACIÓN ADICIONAL: No crear duplicados
      IF should_apply THEN
        -- Verificar que no existe ya una instancia para esta plantilla en este período
        IF EXISTS (
          SELECT 1 FROM expense_instances ei
          JOIN driver_period_calculations dpc ON ei.payment_period_id = dpc.id
          WHERE ei.recurring_template_id = template_record.id
          AND ei.user_id = driver_record.user_id
          AND dpc.company_payment_period_id = period_id
        ) THEN
          should_apply := false;
          instances_skipped := instances_skipped + 1;
          RAISE NOTICE 'Template % already has instance in period % - SKIPPED', template_record.id, period_id;
        END IF;
      END IF;
      
      -- Crear la instancia si debe aplicarse
      IF should_apply THEN
        -- Formatear descripción
        IF template_record.notes IS NOT NULL AND TRIM(template_record.notes) != '' THEN
          formatted_description := template_record.expense_type_name || ' (' || template_record.notes || ')';
        ELSE
          formatted_description := template_record.expense_type_name;
        END IF;
        
        -- Buscar el driver_period_calculation para este conductor
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
              applied_to_role,
              created_by,
              applied_by,
              applied_at
            ) VALUES (
              driver_record.user_id,
              calculation_id,
              template_record.expense_type_id,
              template_record.id,
              template_record.amount,
              target_date,
              formatted_description,
              template_record.notes,
              'applied',
              template_record.applied_to_role,
              auth.uid(),
              auth.uid(),
              now()
            );
            
            instances_created := instances_created + 1;
            RAISE NOTICE 'Created expense instance for template % in period %', template_record.id, period_id;
          ELSE
            validation_errors := validation_errors + 1;
            RAISE NOTICE 'No calculation found for driver % in period %', driver_record.user_id, period_id;
          END IF;
        END;
      END IF;
    END LOOP;
  END LOOP;
  
  -- Mensaje de resultado corregido
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Period week ' || period_month_week || ': Created ' || instances_created || ' instances, skipped ' || instances_skipped || ' duplicates, ' || validation_errors || ' validation errors',
    'instances_created', instances_created,
    'instances_skipped', instances_skipped,
    'validation_errors', validation_errors,
    'period_id', period_id,
    'period_month_week', period_month_week,
    'period_dates', jsonb_build_object(
      'start_date', period_record.period_start_date,
      'end_date', period_record.period_end_date
    )
  );
END;
$function$;