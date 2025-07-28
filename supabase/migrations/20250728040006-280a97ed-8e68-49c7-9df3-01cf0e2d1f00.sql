-- Fix multiple triggers and functions that reference non-existent total_income column

-- First, drop the problematic triggers
DROP TRIGGER IF EXISTS auto_recalc_on_other_income ON other_income;
DROP TRIGGER IF EXISTS auto_recalc_other_income ON other_income;
DROP TRIGGER IF EXISTS trigger_auto_recalc_income ON other_income;

-- Fix the auto_recalculate_driver_period_totals function
CREATE OR REPLACE FUNCTION auto_recalculate_driver_period_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  driver_id UUID;
  period_id UUID;
  company_period_id UUID;
  calc_record RECORD;
  total_gross_earnings numeric := 0;
  total_other_income numeric := 0;
  total_fuel_expenses numeric := 0;
  total_deductions_amount numeric := 0;
  net_payment numeric := 0;
  has_negative boolean := false;
BEGIN
  -- Determinar driver_id y period_id según la tabla que disparó el trigger
  IF TG_TABLE_NAME = 'loads' THEN
    driver_id := COALESCE(NEW.driver_user_id, OLD.driver_user_id);
    period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  ELSIF TG_TABLE_NAME = 'fuel_expenses' THEN
    driver_id := COALESCE(NEW.driver_user_id, OLD.driver_user_id);
    period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  ELSIF TG_TABLE_NAME = 'other_income' THEN
    driver_id := COALESCE(NEW.driver_user_id, OLD.driver_user_id);
    period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  ELSIF TG_TABLE_NAME = 'expense_instances' THEN
    -- Para expense_instances, necesitamos obtener el driver del período
    SELECT dpc.driver_user_id, dpc.company_payment_period_id 
    INTO driver_id, company_period_id
    FROM driver_period_calculations dpc
    WHERE dpc.id = COALESCE(NEW.payment_period_id, OLD.payment_period_id);
    period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  END IF;

  -- Si no tenemos los datos necesarios, salir
  IF driver_id IS NULL OR period_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Obtener el company_payment_period_id si no lo tenemos
  IF company_period_id IS NULL THEN
    IF TG_TABLE_NAME = 'expense_instances' THEN
      SELECT dpc.company_payment_period_id INTO company_period_id
      FROM driver_period_calculations dpc
      WHERE dpc.id = period_id;
    ELSE
      SELECT cpp.id INTO company_period_id
      FROM company_payment_periods cpp
      WHERE period_id = ANY(
        SELECT dpc.id FROM driver_period_calculations dpc 
        WHERE dpc.company_payment_period_id = cpp.id 
        AND dpc.driver_user_id = driver_id
      );
    END IF;
  END IF;

  -- Verificar que el período no esté bloqueado
  IF EXISTS (
    SELECT 1 FROM company_payment_periods cpp 
    WHERE cpp.id = company_period_id AND cpp.is_locked = true
  ) THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Obtener o crear el registro de cálculo del conductor
  SELECT * INTO calc_record
  FROM driver_period_calculations dpc
  WHERE dpc.company_payment_period_id = company_period_id
  AND dpc.driver_user_id = driver_id;

  -- Si no existe, crearlo
  IF NOT FOUND THEN
    INSERT INTO driver_period_calculations (
      company_payment_period_id,
      driver_user_id,
      gross_earnings,
      total_deductions,
      other_income,
      fuel_expenses,
      has_negative_balance
    ) VALUES (
      company_period_id,
      driver_id,
      0, 0, 0, 0, false
    );
    
    SELECT * INTO calc_record
    FROM driver_period_calculations dpc
    WHERE dpc.company_payment_period_id = company_period_id
    AND dpc.driver_user_id = driver_id;
  END IF;

  -- Calculate totals manually
  -- Calculate gross earnings from loads
  SELECT COALESCE(SUM(l.total_amount), 0) INTO total_gross_earnings
  FROM loads l
  WHERE l.driver_user_id = driver_id
  AND l.payment_period_id = company_period_id
  AND l.status = 'completed';
  
  -- Calculate other income
  SELECT COALESCE(SUM(oi.amount), 0) INTO total_other_income
  FROM other_income oi
  WHERE oi.driver_user_id = driver_id
  AND oi.payment_period_id = company_period_id
  AND oi.status = 'approved';
  
  -- Calculate fuel expenses
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO total_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = driver_id
  AND fe.payment_period_id = company_period_id
  AND fe.status = 'approved';
  
  -- Calculate deductions
  SELECT COALESCE(SUM(ei.amount), 0) INTO total_deductions_amount
  FROM expense_instances ei
  WHERE ei.driver_user_id = driver_id
  AND ei.payment_period_id = calc_record.id
  AND ei.status = 'applied';
  
  -- Calculate net payment
  net_payment := (total_gross_earnings + total_other_income) - total_fuel_expenses - total_deductions_amount;
  has_negative := net_payment < 0;

  -- Update calculations
  UPDATE driver_period_calculations 
  SET 
    gross_earnings = total_gross_earnings,
    total_deductions = total_deductions_amount,
    other_income = total_other_income,
    fuel_expenses = total_fuel_expenses,
    has_negative_balance = has_negative,
    updated_at = now()
  WHERE id = calc_record.id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Fix the auto_recalculate_driver_period function
CREATE OR REPLACE FUNCTION auto_recalculate_driver_period()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
      driver_id := COALESCE(NEW.driver_user_id, OLD.driver_user_id);
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
$$;

-- Create a single, clean trigger for other_income
CREATE TRIGGER trigger_other_income_recalc
  AFTER INSERT OR UPDATE OR DELETE ON other_income
  FOR EACH ROW 
  EXECUTE FUNCTION auto_recalculate_driver_period_totals();