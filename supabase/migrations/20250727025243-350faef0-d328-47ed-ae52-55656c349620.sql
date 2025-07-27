-- Función para recalcular automáticamente los totales de un conductor en un período
CREATE OR REPLACE FUNCTION auto_recalculate_driver_period_totals()
RETURNS TRIGGER AS $$
DECLARE
  driver_id UUID;
  period_id UUID;
  company_period_id UUID;
  calc_record RECORD;
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
      total_income,
      net_payment,
      has_negative_balance
    ) VALUES (
      company_period_id,
      driver_id,
      0, 0, 0, 0, 0, false
    );
    
    SELECT * INTO calc_record
    FROM driver_period_calculations dpc
    WHERE dpc.company_payment_period_id = company_period_id
    AND dpc.driver_user_id = driver_id;
  END IF;

  -- Recalcular totales usando la función existente
  UPDATE driver_period_calculations 
  SET 
    gross_earnings = calc.gross_earnings,
    total_deductions = calc.total_deductions,
    other_income = calc.other_income,
    total_income = calc.total_income,
    net_payment = calc.net_payment,
    has_negative_balance = calc.has_negative_balance,
    updated_at = now()
  FROM (
    SELECT * FROM calculate_driver_period_totals(company_period_id, driver_id)
  ) calc
  WHERE id = calc_record.id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers para recálculo automático
DROP TRIGGER IF EXISTS auto_recalc_on_loads ON loads;
CREATE TRIGGER auto_recalc_on_loads
  AFTER INSERT OR UPDATE OR DELETE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_driver_period_totals();

DROP TRIGGER IF EXISTS auto_recalc_on_fuel_expenses ON fuel_expenses;
CREATE TRIGGER auto_recalc_on_fuel_expenses
  AFTER INSERT OR UPDATE OR DELETE ON fuel_expenses
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_driver_period_totals();

DROP TRIGGER IF EXISTS auto_recalc_on_other_income ON other_income;
CREATE TRIGGER auto_recalc_on_other_income
  AFTER INSERT OR UPDATE OR DELETE ON other_income
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_driver_period_totals();

DROP TRIGGER IF EXISTS auto_recalc_on_expense_instances ON expense_instances;
CREATE TRIGGER auto_recalc_on_expense_instances
  AFTER INSERT OR UPDATE OR DELETE ON expense_instances
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_driver_period_totals();