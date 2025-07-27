-- Aplicar deducciones recurrentes manualmente a períodos existentes
-- Sin disparar los triggers problemáticos

DO $$
DECLARE
  period_record RECORD;
  template_record RECORD;
  driver_calc_record RECORD;
  instances_added INTEGER := 0;
BEGIN
  -- Para cada período abierto existente
  FOR period_record IN 
    SELECT id, period_start_date, period_end_date, company_id
    FROM company_payment_periods 
    WHERE status = 'open'
    ORDER BY period_start_date ASC
  LOOP
    RAISE NOTICE 'Processing period % (% to %)', period_record.id, period_record.period_start_date, period_record.period_end_date;
    
    -- Para cada cálculo de conductor en este período
    FOR driver_calc_record IN
      SELECT dpc.id, dpc.driver_user_id
      FROM driver_period_calculations dpc
      WHERE dpc.company_payment_period_id = period_record.id
    LOOP
      -- Para cada plantilla recurrente activa del conductor
      FOR template_record IN
        SELECT ret.*
        FROM recurring_expense_templates ret
        JOIN user_company_roles ucr ON ret.driver_user_id = ucr.user_id
        WHERE ucr.company_id = period_record.company_id
        AND ucr.user_id = driver_calc_record.driver_user_id
        AND ucr.role = 'driver'
        AND ucr.is_active = true
        AND ret.is_active = true
        AND ret.start_date <= period_record.period_end_date
        AND (ret.end_date IS NULL OR ret.end_date >= period_record.period_start_date)
      LOOP
        -- Verificar si ya existe una instancia para esta plantilla en este período
        IF NOT EXISTS (
          SELECT 1 FROM expense_instances ei
          WHERE ei.recurring_template_id = template_record.id
          AND ei.payment_period_id = driver_calc_record.id
        ) THEN
          -- Insertar la instancia de gasto SIN disparar triggers
          INSERT INTO expense_instances (
            payment_period_id,
            expense_type_id,
            recurring_template_id,
            amount,
            description,
            expense_date,
            status,
            is_critical,
            priority
          ) VALUES (
            driver_calc_record.id,
            template_record.expense_type_id,
            template_record.id,
            template_record.amount,
            COALESCE(template_record.notes, 'Deducción recurrente'),
            period_record.period_start_date,
            'planned',
            false,
            5
          );
          
          instances_added := instances_added + 1;
          RAISE NOTICE 'Added expense instance: % (%) for driver % in period %', 
            template_record.amount, template_record.notes, driver_calc_record.driver_user_id, period_record.id;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  
  RAISE NOTICE 'COMPLETED: Added % expense instances to existing periods', instances_added;
END $$;