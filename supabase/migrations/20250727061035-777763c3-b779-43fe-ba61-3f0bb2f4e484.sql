-- Crear trigger automático para recalcular totales cuando cambien los fuel_expenses
CREATE OR REPLACE FUNCTION auto_recalculate_on_fuel_expenses()
RETURNS TRIGGER AS $$
DECLARE
  target_period_id UUID;
  target_driver_id UUID;
BEGIN
  -- Obtener datos del registro afectado
  target_driver_id := COALESCE(NEW.driver_user_id, OLD.driver_user_id);
  target_period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  
  -- Solo proceder si tenemos los datos necesarios
  IF target_driver_id IS NOT NULL AND target_period_id IS NOT NULL THEN
    -- Ejecutar la función de recálculo para el período específico
    PERFORM recalculate_payment_period_totals(target_period_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- Crear el trigger para fuel_expenses
DROP TRIGGER IF EXISTS auto_recalc_fuel_expenses ON fuel_expenses;
CREATE TRIGGER auto_recalc_fuel_expenses
  AFTER INSERT OR UPDATE OR DELETE ON fuel_expenses
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_on_fuel_expenses();

-- También crear triggers similares para otras tablas que afectan los cálculos
CREATE OR REPLACE FUNCTION auto_recalculate_on_loads()
RETURNS TRIGGER AS $$
DECLARE
  target_period_id UUID;
  target_driver_id UUID;
BEGIN
  target_driver_id := COALESCE(NEW.driver_user_id, OLD.driver_user_id);
  target_period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  
  IF target_driver_id IS NOT NULL AND target_period_id IS NOT NULL THEN
    PERFORM recalculate_payment_period_totals(target_period_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS auto_recalc_loads ON loads;
CREATE TRIGGER auto_recalc_loads
  AFTER INSERT OR UPDATE OR DELETE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_on_loads();

-- Trigger para other_income
CREATE OR REPLACE FUNCTION auto_recalculate_on_other_income()
RETURNS TRIGGER AS $$
DECLARE
  target_period_id UUID;
  target_driver_id UUID;
BEGIN
  target_driver_id := COALESCE(NEW.driver_user_id, OLD.driver_user_id);
  target_period_id := COALESCE(NEW.payment_period_id, OLD.payment_period_id);
  
  IF target_driver_id IS NOT NULL AND target_period_id IS NOT NULL THEN
    PERFORM recalculate_payment_period_totals(target_period_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

DROP TRIGGER IF EXISTS auto_recalc_other_income ON other_income;
CREATE TRIGGER auto_recalc_other_income
  AFTER INSERT OR UPDATE OR DELETE ON other_income
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_on_other_income();