-- Fix cleanup_incorrect_recurring_instances to use user_payrolls instead of driver_period_calculations

CREATE OR REPLACE FUNCTION public.cleanup_incorrect_recurring_instances(period_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  period_record RECORD;
  period_month_week INTEGER;
  instances_deleted INTEGER := 0;
  instance_record RECORD;
  current_user_id UUID;
BEGIN
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Obtener información del período
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Período no encontrado'
    );
  END IF;
  
  -- Calcular qué semana del mes es
  period_month_week := CASE 
    WHEN EXTRACT(DAY FROM period_record.period_start_date) BETWEEN 1 AND 7 THEN 1
    WHEN EXTRACT(DAY FROM period_record.period_start_date) BETWEEN 8 AND 14 THEN 2
    WHEN EXTRACT(DAY FROM period_record.period_start_date) BETWEEN 15 AND 21 THEN 3
    WHEN EXTRACT(DAY FROM period_record.period_start_date) BETWEEN 22 AND 28 THEN 4
    ELSE 5
  END;
  
  -- Identificar y eliminar instancias incorrectas
  -- CORREGIDO: Usar user_payrolls en lugar de driver_period_calculations
  FOR instance_record IN
    SELECT 
      ei.id,
      ei.user_id,
      ei.amount,
      ert.frequency,
      ert.month_week,
      ert.id as template_id
    FROM expense_instances ei
    JOIN user_payrolls up ON ei.payment_period_id = up.company_payment_period_id
    JOIN expense_recurring_templates ert ON ei.recurring_template_id = ert.id
    WHERE up.company_payment_period_id = period_id
    AND ei.recurring_template_id IS NOT NULL
  LOOP
    DECLARE
      should_exist BOOLEAN := false;
    BEGIN
      -- Validar si esta instancia debería existir según la lógica de frecuencia
      CASE instance_record.frequency
        WHEN 'weekly' THEN
          should_exist := true;
        WHEN 'biweekly' THEN
          should_exist := (instance_record.month_week = 1 AND period_month_week IN (1, 2)) OR
                         (instance_record.month_week = 2 AND period_month_week IN (3, 4, 5));
        WHEN 'monthly' THEN
          should_exist := instance_record.month_week = period_month_week;
      END CASE;
      
      -- Si no debería existir, eliminarla
      IF NOT should_exist THEN
        DELETE FROM expense_instances WHERE id = instance_record.id;
        instances_deleted := instances_deleted + 1;
        
        RAISE NOTICE 'Deleted incorrect instance: Template % (%-week %) from period week %', 
          instance_record.template_id, instance_record.frequency, instance_record.month_week, period_month_week;
      END IF;
    END;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', format('Cleaned %s incorrect instances from period week %', instances_deleted, period_month_week),
    'instances_deleted', instances_deleted,
    'period_month_week', period_month_week,
    'period_id', period_id
  );
END;
$function$;