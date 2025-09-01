-- ===============================================
-- 🚨 RESTAURACIÓN COMPLETA DE TRIGGERS CRÍTICOS
-- ===============================================
-- Las migraciones eliminaron TODOS los triggers del sistema
-- Necesitamos recrear los que son esenciales para el funcionamiento

-- 1. TRIGGER AUTOMÁTICO DE DEDUCCIONES POR PORCENTAJE (ya existe, pero verificar)
DROP TRIGGER IF EXISTS trigger_auto_generate_percentage_deductions ON loads;
CREATE TRIGGER trigger_auto_generate_percentage_deductions
    AFTER INSERT ON loads
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_percentage_deductions();

-- 2. TRIGGER DE CÁLCULOS AUTOMÁTICOS DE CONDUCTORES
DROP TRIGGER IF EXISTS auto_create_driver_calculations_trigger ON company_payment_periods;
CREATE TRIGGER auto_create_driver_calculations_trigger
    AFTER INSERT ON company_payment_periods
    FOR EACH ROW
    EXECUTE FUNCTION auto_create_driver_calculations();

-- 3. TRIGGER DE BLOQUEO AUTOMÁTICO DE PERÍODOS
DROP TRIGGER IF EXISTS auto_lock_period_trigger ON driver_period_calculations;
CREATE TRIGGER auto_lock_period_trigger
    AFTER UPDATE ON driver_period_calculations
    FOR EACH ROW
    EXECUTE FUNCTION auto_lock_period_when_all_paid();

-- 4. TRIGGER DE APLICACIÓN AUTOMÁTICA DE GASTOS
DROP TRIGGER IF EXISTS auto_apply_expense_instance_trigger ON expense_instances;
CREATE TRIGGER auto_apply_expense_instance_trigger
    BEFORE INSERT ON expense_instances
    FOR EACH ROW
    EXECUTE FUNCTION auto_apply_expense_instance();

-- 5. TRIGGER DE AUDITORÍA DE ROLES
DROP TRIGGER IF EXISTS log_role_changes_trigger ON user_company_roles;
CREATE TRIGGER log_role_changes_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_company_roles
    FOR EACH ROW
    EXECUTE FUNCTION log_role_changes();

-- Verificar todos los triggers recreados
SELECT 
  t.trigger_name,
  t.event_object_table,
  t.action_timing,
  t.event_manipulation
FROM information_schema.triggers t 
WHERE t.event_object_schema = 'public'
ORDER BY t.event_object_table, t.trigger_name;