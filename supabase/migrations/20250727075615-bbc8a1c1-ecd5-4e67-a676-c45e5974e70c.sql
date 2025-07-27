-- Arreglar la función con nombres únicos para evitar ambigüedad

CREATE OR REPLACE FUNCTION public.generate_recurring_expenses_for_period(period_id_param uuid)
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
  period_week INTEGER;
  instances_created INTEGER := 0;
BEGIN
  -- Obtener información del período
  SELECT * INTO period_record 
  FROM company_payment_periods 
  WHERE id = period_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período no encontrado');
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
      SELECT * FROM recurring_expense_templates ret
      WHERE ret.driver_user_id = driver_record.user_id
      AND ret.is_active = true
      AND ret.start_date <= period_record.period_end_date
      AND (ret.end_date IS NULL OR ret.end_date >= period_record.period_start_date)
    LOOP
      should_apply := false;
      
      -- Determinar si el gasto aplica en este período según la frecuencia
      CASE template_record.frequency
        WHEN 'weekly' THEN
          should_apply := true;
          
        WHEN 'biweekly' THEN
          -- Para quincenal, aplicar en semanas impares (1, 3, etc.)
          period_week := EXTRACT(WEEK FROM period_record.period_start_date);
          should_apply := (period_week % 2 = 1);
          
        WHEN 'monthly' THEN
          -- Para mensual, verificar si el mes del período coincide
          should_apply := (
            EXTRACT(MONTH FROM period_record.period_start_date) = 
            EXTRACT(MONTH FROM period_record.period_end_date)
          );
      END CASE;
      
      -- Crear instancia si aplica y no existe ya
      IF should_apply THEN
        IF NOT EXISTS (
          SELECT 1 FROM expense_instances ei
          WHERE ei.recurring_template_id = template_record.id
          AND ei.payment_period_id IN (
            SELECT dpc.id FROM driver_period_calculations dpc
            WHERE dpc.company_payment_period_id = period_id_param
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
            period_id_param,
            driver_record.user_id,
            0, 0, 0, 0, 0, false
          )
          ON CONFLICT (company_payment_period_id, driver_user_id) DO NOTHING;
          
          -- Crear la instancia del gasto
          INSERT INTO expense_instances (
            payment_period_id,
            expense_type_id,
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
             WHERE company_payment_period_id = period_id_param 
             AND driver_user_id = driver_record.user_id),
            template_record.expense_type_id,
            template_record.id,
            template_record.amount,
            template_record.notes,
            period_record.period_start_date,
            'planned',
            false,
            5,
            template_record.created_by
          );
          
          instances_created := instances_created + 1;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'instances_created', instances_created,
    'period_id', period_id_param
  );
END;
$function$;