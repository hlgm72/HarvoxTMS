-- Corregir la función con variables específicas para evitar ambigüedad
CREATE OR REPLACE FUNCTION public.recalculate_payment_period_totals(period_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  calculation_record RECORD;
  calc_gross numeric := 0;
  calc_fuel numeric := 0;
  calc_deductions numeric := 0;
  calc_other_income numeric := 0;
  calc_total_income numeric := 0;
  calc_net_payment numeric := 0;
BEGIN
  -- Recalcular totales para cada conductor en este período
  FOR calculation_record IN 
    SELECT id FROM driver_period_calculations 
    WHERE id = period_id OR company_payment_period_id = period_id
  LOOP
    -- Calcular deducciones totales para este conductor/período
    SELECT COALESCE(SUM(amount), 0) INTO calc_deductions
    FROM expense_instances
    WHERE payment_period_id = calculation_record.id
    AND status = 'applied';
    
    -- Obtener otros valores del cálculo actual
    SELECT 
      COALESCE(gross_earnings, 0),
      COALESCE(fuel_expenses, 0),
      COALESCE(other_income, 0)
    INTO calc_gross, calc_fuel, calc_other_income
    FROM driver_period_calculations
    WHERE id = calculation_record.id;
    
    -- Calcular ingresos totales y pago neto
    calc_total_income := calc_gross + calc_other_income;
    calc_net_payment := calc_total_income - calc_fuel - calc_deductions;
    
    -- Actualizar el registro de cálculos del conductor
    UPDATE driver_period_calculations
    SET 
      total_deductions = calc_deductions,
      total_income = calc_total_income,
      net_payment = calc_net_payment,
      has_negative_balance = (calc_net_payment < 0),
      updated_at = now()
    WHERE id = calculation_record.id;
  END LOOP;
  
  RAISE LOG 'Recalculated totals for period %', period_id;
END;
$function$;