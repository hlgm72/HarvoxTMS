-- Primero corregir la función que tiene el error
CREATE OR REPLACE FUNCTION public.recalculate_payment_period_totals(target_period_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  calculation_record RECORD;
  total_loads_amount NUMERIC := 0;
  total_other_income NUMERIC := 0;
  total_fuel_expenses NUMERIC := 0;
  total_deductions NUMERIC := 0;
  total_income NUMERIC := 0;
  net_payment_calc NUMERIC := 0;
  has_negative BOOLEAN := false;
BEGIN
  -- Obtener el registro de cálculo
  SELECT * INTO calculation_record
  FROM driver_period_calculations
  WHERE id = target_period_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Calcular ingresos por cargas
  SELECT COALESCE(SUM(l.total_amount), 0) INTO total_loads_amount
  FROM loads l
  WHERE l.driver_user_id = calculation_record.driver_user_id
  AND l.payment_period_id = calculation_record.company_payment_period_id
  AND l.status = 'completed';
  
  -- Calcular otros ingresos
  SELECT COALESCE(SUM(oi.amount), 0) INTO total_other_income
  FROM other_income oi
  WHERE oi.user_id = calculation_record.driver_user_id
  AND oi.payment_period_id = target_period_id;
  
  -- Calcular gastos de combustible
  SELECT COALESCE(SUM(fe.total_amount), 0) INTO total_fuel_expenses
  FROM fuel_expenses fe
  WHERE fe.driver_user_id = calculation_record.driver_user_id
  AND fe.payment_period_id = calculation_record.company_payment_period_id;
  
  -- Calcular deducciones (usando user_id en lugar de driver_user_id)
  SELECT COALESCE(SUM(ei.amount), 0) INTO total_deductions
  FROM expense_instances ei
  WHERE ei.user_id = calculation_record.driver_user_id
  AND ei.payment_period_id = calculation_record.id
  AND ei.status = 'applied';
  
  -- Calcular totales
  total_income := total_loads_amount + total_other_income;
  net_payment_calc := total_income - total_fuel_expenses - total_deductions;
  has_negative := net_payment_calc < 0;
  
  -- Actualizar el registro
  UPDATE driver_period_calculations
  SET 
    gross_earnings = total_loads_amount,
    other_income = total_other_income,
    fuel_expenses = total_fuel_expenses,
    total_deductions = total_deductions,
    total_income = total_income,
    net_payment = net_payment_calc,
    has_negative_balance = has_negative,
    updated_at = now()
  WHERE id = target_period_id;
END;
$function$;

-- Ahora proceder con la eliminación
-- Eliminar el período actual y el siguiente para la empresa específica
WITH current_and_next_periods AS (
  SELECT id 
  FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
  ORDER BY period_start_date ASC
  LIMIT 2
)
-- Primero eliminar las instancias de gastos
DELETE FROM expense_instances 
WHERE payment_period_id IN (
  SELECT dpc.id FROM driver_period_calculations dpc 
  WHERE dpc.company_payment_period_id IN (SELECT id FROM current_and_next_periods)
);

-- Actualizar fuel_expenses para quitar referencias
WITH current_and_next_periods AS (
  SELECT id 
  FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
  ORDER BY period_start_date ASC
  LIMIT 2
)
UPDATE fuel_expenses 
SET payment_period_id = NULL 
WHERE payment_period_id IN (SELECT id FROM current_and_next_periods);

-- Actualizar loads para quitar referencias
WITH current_and_next_periods AS (
  SELECT id 
  FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
  ORDER BY period_start_date ASC
  LIMIT 2
)
UPDATE loads 
SET payment_period_id = NULL 
WHERE payment_period_id IN (SELECT id FROM current_and_next_periods);

-- Eliminar las calculaciones de conductores
WITH current_and_next_periods AS (
  SELECT id 
  FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
  ORDER BY period_start_date ASC
  LIMIT 2
)
DELETE FROM driver_period_calculations 
WHERE company_payment_period_id IN (SELECT id FROM current_and_next_periods);

-- Finalmente eliminar los períodos
DELETE FROM company_payment_periods 
WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
AND status = 'open';