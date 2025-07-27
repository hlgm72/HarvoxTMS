-- Modificar el trigger para incluir generación automática de deducciones recurrentes

CREATE OR REPLACE FUNCTION public.auto_create_driver_calculations()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  driver_record RECORD;
  recurring_result JSONB;
BEGIN
  -- Solo para INSERT de nuevos períodos
  IF TG_OP = 'INSERT' THEN
    -- Crear calculations para todos los conductores activos de la empresa
    FOR driver_record IN 
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id = NEW.company_id 
        AND ucr.role = 'driver' 
        AND ucr.is_active = true
    LOOP
      INSERT INTO driver_period_calculations (
        company_payment_period_id,
        driver_user_id,
        gross_earnings,
        fuel_expenses,
        total_deductions,
        other_income,
        total_income,
        net_payment,
        has_negative_balance,
        payment_status
      ) VALUES (
        NEW.id,
        driver_record.user_id,
        0, 0, 0, 0, 0, 0, false,
        'calculated'
      )
      ON CONFLICT (company_payment_period_id, driver_user_id) DO NOTHING;
    END LOOP;
    
    -- Generar automáticamente las deducciones recurrentes para este período
    SELECT generate_recurring_expenses_for_period(NEW.id) INTO recurring_result;
    
    -- Log del resultado de generación de gastos recurrentes
    RAISE NOTICE 'Generated recurring expenses for period %: %', NEW.id, recurring_result;
    
  END IF;
  
  RETURN NEW;
END;
$function$;