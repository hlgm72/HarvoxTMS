-- Corregir función para calcular correctamente las semanas del mes en deducciones recurrentes
CREATE OR REPLACE FUNCTION public.generate_recurring_expenses_for_period_fixed(
  period_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  period_record RECORD;
  template_record RECORD;
  driver_record RECORD;
  should_apply BOOLEAN;
  target_date DATE;
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
    -- Obtener plantillas activas para este conductor
    FOR template_record IN 
      SELECT * FROM expense_recurring_templates ert
      WHERE ert.user_id = driver_record.user_id
      AND ert.is_active = true
      AND ert.start_date <= period_record.period_end_date
      AND (ert.end_date IS NULL OR ert.end_date >= period_record.period_start_date)
    LOOP
      BEGIN
        should_apply := false;
        target_date := NULL;
        
        -- Determinar si el gasto aplica en este período según la frecuencia
        CASE template_record.frequency
          WHEN 'weekly' THEN
            -- Aplicar todas las semanas
            should_apply := true;
            target_date := period_record.period_end_date;
            
          WHEN 'biweekly' THEN
            -- Aplicar cada quincena del mes
            -- Primera quincena: días 1-15, Segunda quincena: días 16-fin
            IF template_record.month_week = 1 THEN
              -- Primera quincena (días 1-15)
              IF EXTRACT(DAY FROM period_record.period_start_date) <= 15 
                 AND EXTRACT(DAY FROM period_record.period_end_date) >= 1 THEN
                should_apply := true;
                target_date := LEAST(
                  period_record.period_end_date,
                  DATE_TRUNC('month', period_record.period_start_date) + INTERVAL '14 days'
                );
              END IF;
            ELSIF template_record.month_week = 2 THEN
              -- Segunda quincena (días 16-fin)
              IF EXTRACT(DAY FROM period_record.period_start_date) <= 31 
                 AND EXTRACT(DAY FROM period_record.period_end_date) >= 16 THEN
                should_apply := true;
                target_date := period_record.period_end_date;
              END IF;
            END IF;
            
          WHEN 'monthly' THEN
            -- Aplicar según la semana específica del mes
            CASE template_record.month_week
              WHEN 1 THEN
                -- Primera semana del mes: días 1-7
                IF EXTRACT(DAY FROM period_record.period_start_date) <= 7 
                   AND EXTRACT(DAY FROM period_record.period_end_date) >= 1 THEN
                  should_apply := true;
                  target_date := LEAST(
                    period_record.period_end_date,
                    DATE_TRUNC('month', period_record.period_start_date) + INTERVAL '6 days'
                  );
                END IF;
                
              WHEN 2 THEN
                -- Segunda semana del mes: días 8-14
                IF EXTRACT(DAY FROM period_record.period_start_date) <= 14 
                   AND EXTRACT(DAY FROM period_record.period_end_date) >= 8 THEN
                  should_apply := true;
                  target_date := LEAST(
                    period_record.period_end_date,
                    DATE_TRUNC('month', period_record.period_start_date) + INTERVAL '13 days'
                  );
                END IF;
                
              WHEN 3 THEN
                -- Tercera semana del mes: días 15-21
                IF EXTRACT(DAY FROM period_record.period_start_date) <= 21 
                   AND EXTRACT(DAY FROM period_record.period_end_date) >= 15 THEN
                  should_apply := true;
                  target_date := LEAST(
                    period_record.period_end_date,
                    DATE_TRUNC('month', period_record.period_start_date) + INTERVAL '20 days'
                  );
                END IF;
                
              WHEN 4 THEN
                -- Cuarta semana del mes: días 22-28
                IF EXTRACT(DAY FROM period_record.period_start_date) <= 28 
                   AND EXTRACT(DAY FROM period_record.period_end_date) >= 22 THEN
                  should_apply := true;
                  target_date := LEAST(
                    period_record.period_end_date,
                    DATE_TRUNC('month', period_record.period_start_date) + INTERVAL '27 days'
                  );
                END IF;
                
              WHEN 5 THEN
                -- Quinta semana del mes (si existe): días 29+
                IF EXTRACT(DAY FROM period_record.period_start_date) <= 31 
                   AND EXTRACT(DAY FROM period_record.period_end_date) >= 29 THEN
                  should_apply := true;
                  target_date := period_record.period_end_date;
                END IF;
                
              ELSE
                -- Por defecto, aplicar al final del período si no se especifica semana
                should_apply := true;
                target_date := period_record.period_end_date;
            END CASE;
        END CASE;
        
        -- Crear instancia si aplica y no existe ya
        IF should_apply AND target_date IS NOT NULL THEN
          -- Verificar que no existe ya una instancia para esta plantilla y período
          IF NOT EXISTS (
            SELECT 1 FROM expense_instances ei
            WHERE ei.recurring_template_id = template_record.id
            AND ei.payment_period_id IN (
              SELECT dpc.id FROM driver_period_calculations dpc
              WHERE dpc.company_payment_period_id = period_id
              AND dpc.driver_user_id = driver_record.user_id
            )
          ) THEN
            -- Buscar o crear el cálculo del conductor para este período
            INSERT INTO driver_period_calculations (
              company_payment_period_id,
              driver_user_id,
              gross_earnings,
              total_deductions,
              other_income,
              total_income,
              net_payment,
              has_negative_balance
            ) VALUES (
              period_id,
              driver_record.user_id,
              0, 0, 0, 0, 0, false
            )
            ON CONFLICT (company_payment_period_id, driver_user_id) DO NOTHING;
            
            -- Crear la instancia del gasto
            INSERT INTO expense_instances (
              payment_period_id,
              expense_type_id,
              user_id,
              recurring_template_id,
              amount,
              description,
              expense_date,
              status,
              is_critical,
              priority,
              created_by
            ) VALUES (
              (SELECT id FROM driver_period_calculations 
               WHERE company_payment_period_id = period_id 
               AND driver_user_id = driver_record.user_id),
              template_record.expense_type_id,
              template_record.user_id,
              template_record.id,
              template_record.amount,
              COALESCE(template_record.notes, 'Deducción recurrente automática'),
              target_date,
              'planned',
              false,
              5,
              auth.uid()
            );
            
            instances_created := instances_created + 1;
          ELSE
            instances_skipped := instances_skipped + 1;
          END IF;
        END IF;
        
      EXCEPTION WHEN OTHERS THEN
        errors_encountered := errors_encountered + 1;
        RAISE NOTICE 'Error creando instancia para plantilla %: %', template_record.id, SQLERRM;
      END;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'instances_created', instances_created,
    'instances_skipped', instances_skipped,
    'errors_encountered', errors_encountered,
    'period_id', period_id,
    'message', format('Generadas %s deducciones recurrentes, %s omitidas (ya existen), %s errores', 
                     instances_created, instances_skipped, errors_encountered)
  );
END;
$$;

-- Reemplazar la función original con la corregida
DROP FUNCTION IF EXISTS public.generate_recurring_expenses_for_period(UUID);
CREATE OR REPLACE FUNCTION public.generate_recurring_expenses_for_period(period_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Llamar a la función corregida
  RETURN public.generate_recurring_expenses_for_period_fixed(period_id);
END;
$$;

-- Comentarios explicativos de la corrección
COMMENT ON FUNCTION public.generate_recurring_expenses_for_period_fixed IS 
'Función corregida que calcula correctamente las semanas del mes para deducciones recurrentes:
- Semanal: Se aplica cada semana
- Quincenal: 1ra quincena (días 1-15), 2da quincena (días 16-fin)
- Mensual: Por semana específica del mes según calendario estándar
  * Semana 1: días 1-7
  * Semana 2: días 8-14  
  * Semana 3: días 15-21
  * Semana 4: días 22-28
  * Semana 5: días 29+ (si existe)';

COMMENT ON FUNCTION public.generate_recurring_expenses_for_period IS 
'Función principal para generar deducciones recurrentes - ahora usa la lógica corregida de cálculo de semanas del mes';