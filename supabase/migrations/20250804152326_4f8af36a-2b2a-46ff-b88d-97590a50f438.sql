-- Eliminar los triggers problemáticos temporalmente
DROP TRIGGER IF EXISTS auto_recalculate_on_fuel_expenses_trigger ON fuel_expenses;
DROP TRIGGER IF EXISTS auto_recalculate_on_loads_trigger ON loads;
DROP TRIGGER IF EXISTS auto_recalculate_on_other_income_trigger ON other_income;

-- Eliminar directamente sin triggers
DELETE FROM fuel_expenses 
WHERE payment_period_id IN (
  SELECT id FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
);

DELETE FROM loads 
WHERE payment_period_id IN (
  SELECT id FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
);

DELETE FROM expense_instances 
WHERE payment_period_id IN (
  SELECT dpc.id FROM driver_period_calculations dpc 
  WHERE dpc.company_payment_period_id IN (
    SELECT id FROM company_payment_periods 
    WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
    AND status = 'open'
  )
);

DELETE FROM driver_period_calculations 
WHERE company_payment_period_id IN (
  SELECT id FROM company_payment_periods 
  WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
  AND status = 'open'
);

DELETE FROM company_payment_periods 
WHERE company_id = 'e5d52767-ca59-4c28-94e4-058aff6a037b'
AND status = 'open';

-- Recrear los triggers con las funciones corregidas
CREATE TRIGGER auto_recalculate_on_fuel_expenses_trigger
    AFTER INSERT OR UPDATE OR DELETE ON fuel_expenses
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_fuel_expenses();

CREATE TRIGGER auto_recalculate_on_loads_trigger
    AFTER INSERT OR UPDATE OR DELETE ON loads
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_loads();

CREATE TRIGGER auto_recalculate_on_other_income_trigger
    AFTER INSERT OR UPDATE OR DELETE ON other_income
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_other_income();