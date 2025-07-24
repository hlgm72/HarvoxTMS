-- Función para generar instancias de gastos recurrentes para un período específico
CREATE OR REPLACE FUNCTION public.generate_recurring_expenses_for_period(
  company_payment_period_id UUID
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
  period_week INTEGER;
  period_day INTEGER;
  instances_created INTEGER := 0;
BEGIN
  -- Obtener información del período
  SELECT * INTO period_record 
  FROM public.company_payment_periods 
  WHERE id = company_payment_period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período no encontrado');
  END IF;
  
  -- Obtener conductores activos de la empresa
  FOR driver_record IN 
    SELECT ucr.user_id
    FROM public.user_company_roles ucr
    WHERE ucr.company_id = period_record.company_id 
    AND ucr.role = 'driver' 
    AND ucr.is_active = true
  LOOP
    -- Obtener plantillas activas para este conductor
    FOR template_record IN 
      SELECT * FROM public.recurring_expense_templates ret
      WHERE ret.driver_user_id = driver_record.user_id
      AND ret.is_active = true
      AND ret.effective_from <= period_record.period_end_date
      AND (ret.effective_until IS NULL OR ret.effective_until >= period_record.period_start_date)
    LOOP
      should_apply := false;
      
      -- Determinar si el gasto aplica en este período según la frecuencia
      CASE template_record.frequency
        WHEN 'weekly' THEN
          should_apply := true;
          
        WHEN 'biweekly' THEN
          -- Calcular semana del período (1 o 2)
          period_week := CASE 
            WHEN EXTRACT(DOW FROM period_record.period_start_date) = 1 THEN 1 -- Si inicia lunes
            ELSE 2 
          END;
          
          should_apply := (template_record.frequency_config->>'week_of_period')::INTEGER = period_week;
          
        WHEN 'monthly' THEN
          -- Verificar si la fecha objetivo cae en este período
          period_day := (template_record.frequency_config->>'day_of_month')::INTEGER;
          should_apply := (
            period_day BETWEEN EXTRACT(DAY FROM period_record.period_start_date) 
            AND EXTRACT(DAY FROM period_record.period_end_date)
          );
      END CASE;
      
      -- Crear instancia si aplica y no existe ya
      IF should_apply THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.expense_instances ei
          WHERE ei.recurring_template_id = template_record.id
          AND ei.payment_period_id IN (
            SELECT dpc.id FROM public.driver_period_calculations dpc
            WHERE dpc.company_payment_period_id = company_payment_period_id
            AND dpc.driver_user_id = driver_record.user_id
          )
        ) THEN
          -- Buscar o crear el cálculo del conductor para este período
          INSERT INTO public.driver_period_calculations (
            company_payment_period_id,
            driver_user_id,
            gross_earnings,
            total_deductions,
            other_income,
            total_income,
            net_payment,
            has_negative_balance
          ) VALUES (
            company_payment_period_id,
            driver_record.user_id,
            0, 0, 0, 0, 0, false
          )
          ON CONFLICT (company_payment_period_id, driver_user_id) DO NOTHING;
          
          -- Crear la instancia del gasto
          INSERT INTO public.expense_instances (
            payment_period_id, -- Esto necesita el ID del driver_period_calculation
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
            (SELECT id FROM public.driver_period_calculations 
             WHERE company_payment_period_id = company_payment_period_id 
             AND driver_user_id = driver_record.user_id),
            template_record.expense_type_id,
            template_record.id,
            template_record.amount,
            template_record.notes,
            period_record.period_start_date,
            'planned',
            false, -- Los gastos recurrentes no son críticos por defecto
            5, -- Prioridad normal
            auth.uid()
          );
          
          instances_created := instances_created + 1;
        END IF;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'instances_created', instances_created,
    'period_id', company_payment_period_id
  );
END;
$$;