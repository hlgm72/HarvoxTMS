-- Fix the auto_recalculate_driver_period function to use correct column names
CREATE OR REPLACE FUNCTION public.auto_recalculate_driver_period()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_calculation_id UUID;
  company_period_id UUID;
  driver_id UUID;
BEGIN
  -- Determinar los valores según la tabla que disparó el trigger
  CASE TG_TABLE_NAME
    WHEN 'loads' THEN
      driver_id := COALESCE(NEW.driver_user_id, OLD.driver_user_id);
      company_period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
      
    WHEN 'fuel_expenses' THEN
      driver_id := COALESCE(NEW.driver_user_id, OLD.driver_user_id);
      -- Para fuel_expenses, necesitamos encontrar el company_payment_period_id
      SELECT dpc.company_payment_period_id INTO company_period_id
      FROM driver_period_calculations dpc
      WHERE dpc.id = COALESCE(NEW.payment_period_id, OLD.payment_period_id);
      
    WHEN 'expense_instances' THEN
      -- Para expense_instances, obtenemos driver y company_period de la calculation
      SELECT dpc.driver_user_id, dpc.company_payment_period_id 
      INTO driver_id, company_period_id
      FROM driver_period_calculations dpc
      WHERE dpc.id = COALESCE(NEW.payment_period_id, OLD.payment_period_id);
      
    WHEN 'other_income' THEN
      -- Fix: other_income table uses user_id, not driver_user_id
      driver_id := COALESCE(NEW.user_id, OLD.user_id);
      -- Para other_income, necesitamos encontrar el company_payment_period_id
      SELECT dpc.company_payment_period_id INTO company_period_id
      FROM driver_period_calculations dpc
      WHERE dpc.id = COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  END CASE;

  -- Salir si no tenemos datos suficientes
  IF driver_id IS NULL OR company_period_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Verificar que el período no esté bloqueado
  IF EXISTS (
    SELECT 1 FROM company_payment_periods 
    WHERE id = company_period_id AND is_locked = true
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Buscar o crear el calculation record
  SELECT id INTO target_calculation_id
  FROM driver_period_calculations
  WHERE company_payment_period_id = company_period_id
    AND driver_user_id = driver_id;

  -- Si no existe el calculation, crearlo
  IF target_calculation_id IS NULL THEN
    INSERT INTO driver_period_calculations (
      company_payment_period_id,
      driver_user_id,
      gross_earnings,
      fuel_expenses,
      total_deductions,
      other_income,
      has_negative_balance,
      payment_status
    ) VALUES (
      company_period_id,
      driver_id,
      0, 0, 0, 0, false,
      'calculated'
    ) RETURNING id INTO target_calculation_id;
  END IF;

  -- Ejecutar el recálculo
  PERFORM calculate_driver_payment_period(target_calculation_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;