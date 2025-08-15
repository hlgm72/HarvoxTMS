-- Función para recalcular totales de un período de conductor
CREATE OR REPLACE FUNCTION recalculate_driver_period_totals(period_calc_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  period_record RECORD;
  total_deductions_calc NUMERIC := 0;
  total_fuel_expenses_calc NUMERIC := 0;
  net_payment_calc NUMERIC := 0;
BEGIN
  -- Obtener el registro del período
  SELECT * INTO period_record
  FROM driver_period_calculations
  WHERE id = period_calc_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período no encontrado');
  END IF;
  
  -- Calcular total de deducciones (expense_instances con status aplicado)
  SELECT COALESCE(SUM(amount), 0) INTO total_deductions_calc
  FROM expense_instances
  WHERE payment_period_id = period_calc_id
  AND status IN ('applied', 'planned')
  AND amount > 0;
  
  -- Calcular total de gastos de combustible (si existe la tabla fuel_expenses)
  SELECT COALESCE(SUM(total_amount), 0) INTO total_fuel_expenses_calc
  FROM fuel_expenses
  WHERE payment_period_id = period_calc_id
  AND status IN ('approved', 'paid');
  
  -- Calcular pago neto
  net_payment_calc := period_record.gross_earnings + period_record.other_income - total_deductions_calc - total_fuel_expenses_calc;
  
  -- Actualizar totales en driver_period_calculations
  UPDATE driver_period_calculations
  SET 
    total_deductions = total_deductions_calc,
    fuel_expenses = total_fuel_expenses_calc,
    total_income = period_record.gross_earnings + period_record.other_income,
    net_payment = net_payment_calc,
    has_negative_balance = (net_payment_calc < 0),
    balance_alert_message = CASE 
      WHEN net_payment_calc < 0 THEN 'Saldo negativo: $' || ABS(net_payment_calc)::text
      ELSE NULL
    END,
    updated_at = now()
  WHERE id = period_calc_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'message', 'Totales recalculados exitosamente',
    'period_id', period_calc_id,
    'totals', jsonb_build_object(
      'total_deductions', total_deductions_calc,
      'fuel_expenses', total_fuel_expenses_calc,
      'net_payment', net_payment_calc,
      'has_negative_balance', (net_payment_calc < 0)
    )
  );
  
EXCEPTION WHEN OTHERS THEN
  -- Manejo de errores - si fuel_expenses no existe, solo calcular deducciones
  IF SQLSTATE = '42P01' THEN -- Tabla no existe
    net_payment_calc := period_record.gross_earnings + period_record.other_income - total_deductions_calc;
    
    UPDATE driver_period_calculations
    SET 
      total_deductions = total_deductions_calc,
      fuel_expenses = 0,
      total_income = period_record.gross_earnings + period_record.other_income,
      net_payment = net_payment_calc,
      has_negative_balance = (net_payment_calc < 0),
      balance_alert_message = CASE 
        WHEN net_payment_calc < 0 THEN 'Saldo negativo: $' || ABS(net_payment_calc)::text
        ELSE NULL
      END,
      updated_at = now()
    WHERE id = period_calc_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'message', 'Totales recalculados exitosamente (sin gastos de combustible)',
      'period_id', period_calc_id,
      'totals', jsonb_build_object(
        'total_deductions', total_deductions_calc,
        'fuel_expenses', 0,
        'net_payment', net_payment_calc,
        'has_negative_balance', (net_payment_calc < 0)
      )
    );
  END IF;
  
  RAISE;
END;
$$;

-- Trigger para recalcular automáticamente cuando se modifiquen expense_instances
CREATE OR REPLACE FUNCTION trigger_recalculate_period_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Para INSERT y UPDATE, recalcular el período del nuevo registro
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    PERFORM recalculate_driver_period_totals(NEW.payment_period_id);
    RETURN NEW;
  END IF;
  
  -- Para DELETE, recalcular el período del registro eliminado
  IF TG_OP = 'DELETE' THEN
    PERFORM recalculate_driver_period_totals(OLD.payment_period_id);
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$;

-- Crear trigger para expense_instances
DROP TRIGGER IF EXISTS expense_instances_recalculate_totals ON expense_instances;
CREATE TRIGGER expense_instances_recalculate_totals
  AFTER INSERT OR UPDATE OR DELETE ON expense_instances
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_period_totals();