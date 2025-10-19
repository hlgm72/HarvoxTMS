-- ============================================
-- CORRECCIÓN: LIMPIAR USER_PAYROLLS VACÍOS PRIMERO, LUEGO PERÍODOS
-- ============================================

-- Función para limpiar user_payroll individual si queda vacío
CREATE OR REPLACE FUNCTION cleanup_empty_user_payroll(target_payroll_id UUID)
RETURNS JSONB AS $$
DECLARE
  payroll_record RECORD;
  period_id UUID;
BEGIN
  -- Obtener información del payroll
  SELECT * INTO payroll_record
  FROM user_payrolls
  WHERE id = target_payroll_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Payroll no encontrado');
  END IF;
  
  -- Verificar si está pagado (no eliminar si está pagado)
  IF payroll_record.payment_status = 'paid' THEN
    RETURN jsonb_build_object('success', false, 'message', 'Payroll está pagado, no se puede eliminar');
  END IF;
  
  -- Verificar si está vacío
  IF payroll_record.gross_earnings = 0 
    AND payroll_record.fuel_expenses = 0 
    AND payroll_record.total_deductions = 0 
    AND payroll_record.other_income = 0 THEN
    
    period_id := payroll_record.company_payment_period_id;
    
    -- Eliminar expense_instances asociadas
    DELETE FROM expense_instances
    WHERE payment_period_id = target_payroll_id;
    
    -- Eliminar el payroll
    DELETE FROM user_payrolls
    WHERE id = target_payroll_id;
    
    RAISE LOG 'cleanup_empty_user_payroll: Deleted empty payroll %', target_payroll_id;
    
    -- Intentar limpiar el período si quedó vacío
    PERFORM cleanup_empty_payment_period(period_id);
    
    RETURN jsonb_build_object(
      'success', true,
      'action', 'deleted',
      'message', 'Payroll vacío eliminado',
      'payroll_id', target_payroll_id,
      'period_id', period_id
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'action', 'kept',
      'message', 'Payroll tiene datos, se mantiene'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Función mejorada para verificar período vacío (solo si NO tiene payrolls)
CREATE OR REPLACE FUNCTION cleanup_empty_payment_period(target_period_id UUID)
RETURNS JSONB AS $$
DECLARE
  period_record RECORD;
  has_payrolls BOOLEAN := false;
BEGIN
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = target_period_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Período no encontrado');
  END IF;
  
  -- Verificar si tiene user_payrolls
  SELECT EXISTS (
    SELECT 1 FROM user_payrolls 
    WHERE company_payment_period_id = target_period_id
  ) INTO has_payrolls;
  
  -- Solo eliminar si NO tiene payrolls
  IF NOT has_payrolls THEN
    DELETE FROM company_payment_periods
    WHERE id = target_period_id;
    
    RAISE LOG 'cleanup_empty_payment_period: Deleted empty period % (no payrolls)', target_period_id;
    
    RETURN jsonb_build_object(
      'success', true,
      'action', 'deleted',
      'message', 'Período sin payrolls eliminado',
      'period_id', target_period_id
    );
  ELSE
    RETURN jsonb_build_object(
      'success', true,
      'action', 'kept',
      'message', 'Período tiene payrolls, se mantiene'
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger mejorado: primero limpia payroll, luego período
CREATE OR REPLACE FUNCTION trigger_cleanup_after_instance_delete()
RETURNS TRIGGER AS $$
DECLARE
  payroll_id_to_check UUID;
BEGIN
  -- Determinar qué payroll verificar según la tabla
  IF TG_TABLE_NAME = 'loads' THEN
    -- Para loads, buscar el payroll del driver en ese período
    SELECT up.id INTO payroll_id_to_check
    FROM user_payrolls up
    WHERE up.user_id = OLD.driver_user_id
    AND up.company_payment_period_id = OLD.payment_period_id;
    
  ELSIF TG_TABLE_NAME = 'fuel_expenses' THEN
    -- Para fuel, buscar el payroll del driver en ese período
    SELECT up.id INTO payroll_id_to_check
    FROM user_payrolls up
    WHERE up.user_id = OLD.driver_user_id
    AND up.company_payment_period_id = OLD.payment_period_id;
    
  ELSIF TG_TABLE_NAME = 'expense_instances' THEN
    -- Para expense_instances, el payment_period_id ES el user_payroll_id
    payroll_id_to_check := OLD.payment_period_id;
  END IF;
  
  -- Verificar y limpiar el payroll si quedó vacío
  IF payroll_id_to_check IS NOT NULL THEN
    PERFORM cleanup_empty_user_payroll(payroll_id_to_check);
  END IF;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Reemplazar trigger existente
DROP TRIGGER IF EXISTS trigger_check_empty_period_after_delete ON loads;
DROP TRIGGER IF EXISTS trigger_check_empty_period_after_delete ON fuel_expenses;
DROP TRIGGER IF EXISTS trigger_check_empty_period_after_delete ON expense_instances;

CREATE TRIGGER trigger_cleanup_payroll_after_load_delete
  AFTER DELETE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_after_instance_delete();

CREATE TRIGGER trigger_cleanup_payroll_after_fuel_delete
  AFTER DELETE ON fuel_expenses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_after_instance_delete();

CREATE TRIGGER trigger_cleanup_payroll_after_expense_delete
  AFTER DELETE ON expense_instances
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_after_instance_delete();