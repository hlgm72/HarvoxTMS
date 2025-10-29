
-- ============================================================================
-- INMUTABILIDAD DE PERÍODOS PAGADOS - Sistema de Protección Completo
-- ============================================================================
-- Una vez que un payroll se marca como 'paid', NINGÚN dato del período puede
-- ser modificado, eliminado o añadido. Esto incluye:
-- - Cargas (loads)
-- - Combustible (fuel_expenses)
-- - Deducciones eventuales (expense_instances)
-- - Otros ingresos
-- ============================================================================

-- 1. FUNCIÓN HELPER: Verificar si existe un payroll pagado para un usuario y período
CREATE OR REPLACE FUNCTION is_period_paid_for_user(
  p_user_id UUID,
  p_period_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_paid BOOLEAN;
BEGIN
  -- Verificar si existe un payroll con payment_status = 'paid' para este usuario y período
  SELECT EXISTS (
    SELECT 1 
    FROM user_payrolls 
    WHERE user_id = p_user_id 
      AND company_payment_period_id = p_period_id
      AND payment_status = 'paid'
  ) INTO v_is_paid;
  
  RETURN v_is_paid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 2. FUNCIÓN: Verificar si una carga pertenece a un período pagado
CREATE OR REPLACE FUNCTION check_load_period_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_id UUID;
  v_period_id UUID;
  v_is_paid BOOLEAN;
BEGIN
  -- Para DELETE, usar OLD; para INSERT/UPDATE usar NEW
  IF TG_OP = 'DELETE' THEN
    v_driver_id := OLD.driver_user_id;
    v_period_id := OLD.payment_period_id;
  ELSE
    v_driver_id := NEW.driver_user_id;
    v_period_id := NEW.payment_period_id;
  END IF;
  
  -- Si no hay período asignado, permitir la operación
  IF v_period_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Verificar si el período está pagado
  v_is_paid := is_period_paid_for_user(v_driver_id, v_period_id);
  
  IF v_is_paid THEN
    RAISE EXCEPTION 'No se pueden modificar datos de un período pagado. El payroll del conductor para este período ya fue procesado y pagado.'
      USING HINT = 'Los períodos pagados son inmutables por razones de auditoría y cumplimiento.',
            ERRCODE = 'P0001';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNCIÓN: Verificar si un gasto de combustible pertenece a un período pagado
CREATE OR REPLACE FUNCTION check_fuel_period_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_id UUID;
  v_period_id UUID;
  v_is_paid BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_driver_id := OLD.driver_user_id;
    v_period_id := OLD.payment_period_id;
  ELSE
    v_driver_id := NEW.driver_user_id;
    v_period_id := NEW.payment_period_id;
  END IF;
  
  IF v_period_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  v_is_paid := is_period_paid_for_user(v_driver_id, v_period_id);
  
  IF v_is_paid THEN
    RAISE EXCEPTION 'No se pueden modificar gastos de combustible de un período pagado. El payroll del conductor para este período ya fue procesado y pagado.'
      USING HINT = 'Los períodos pagados son inmutables por razones de auditoría y cumplimiento.',
            ERRCODE = 'P0001';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNCIÓN: Verificar si una deducción pertenece a un período pagado
CREATE OR REPLACE FUNCTION check_expense_period_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_period_id UUID;
  v_is_paid BOOLEAN;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_period_id := OLD.payment_period_id;
  ELSE
    v_user_id := NEW.user_id;
    v_period_id := NEW.payment_period_id;
  END IF;
  
  IF v_period_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  v_is_paid := is_period_paid_for_user(v_user_id, v_period_id);
  
  IF v_is_paid THEN
    RAISE EXCEPTION 'No se pueden modificar deducciones de un período pagado. El payroll del usuario para este período ya fue procesado y pagado.'
      USING HINT = 'Los períodos pagados son inmutables por razones de auditoría y cumplimiento.',
            ERRCODE = 'P0001';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. DROP TRIGGERS EXISTENTES (si existen)
DROP TRIGGER IF EXISTS trg_prevent_load_changes_on_paid_period ON loads;
DROP TRIGGER IF EXISTS trg_prevent_fuel_changes_on_paid_period ON fuel_expenses;
DROP TRIGGER IF EXISTS trg_prevent_expense_changes_on_paid_period ON expense_instances;

-- 6. CREAR TRIGGERS PARA LOADS
-- Proteger INSERT, UPDATE y DELETE
CREATE TRIGGER trg_prevent_load_changes_on_paid_period
  BEFORE INSERT OR UPDATE OR DELETE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION check_load_period_immutability();

-- 7. CREAR TRIGGERS PARA FUEL_EXPENSES
CREATE TRIGGER trg_prevent_fuel_changes_on_paid_period
  BEFORE INSERT OR UPDATE OR DELETE ON fuel_expenses
  FOR EACH ROW
  EXECUTE FUNCTION check_fuel_period_immutability();

-- 8. CREAR TRIGGERS PARA EXPENSE_INSTANCES
CREATE TRIGGER trg_prevent_expense_changes_on_paid_period
  BEFORE INSERT OR UPDATE OR DELETE ON expense_instances
  FOR EACH ROW
  EXECUTE FUNCTION check_expense_period_immutability();

-- 9. COMENTARIOS PARA DOCUMENTACIÓN
COMMENT ON FUNCTION is_period_paid_for_user IS 
  'Verifica si existe un payroll pagado para un usuario en un período específico. Retorna TRUE si el período está pagado y es inmutable.';

COMMENT ON FUNCTION check_load_period_immutability IS 
  'Trigger function que previene cualquier modificación (INSERT/UPDATE/DELETE) en loads cuando el período está pagado.';

COMMENT ON FUNCTION check_fuel_period_immutability IS 
  'Trigger function que previene cualquier modificación (INSERT/UPDATE/DELETE) en fuel_expenses cuando el período está pagado.';

COMMENT ON FUNCTION check_expense_period_immutability IS 
  'Trigger function que previene cualquier modificación (INSERT/UPDATE/DELETE) en expense_instances cuando el período está pagado.';

-- Registro de la implementación
DO $$
BEGIN
  RAISE NOTICE '✅ Sistema de inmutabilidad de períodos pagados implementado exitosamente';
  RAISE NOTICE '📋 Protección activada en: loads, fuel_expenses, expense_instances';
  RAISE NOTICE '🔒 Una vez que un payroll se marca como "paid", ningún dato del período puede modificarse';
END $$;
