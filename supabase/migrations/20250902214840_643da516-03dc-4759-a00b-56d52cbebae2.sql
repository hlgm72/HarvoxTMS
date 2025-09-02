-- ===============================================
-- 🚨 RESTAURAR TRIGGERS AUTOMÁTICOS CRÍTICOS
-- ===============================================
-- Estas funciones existen pero los triggers fueron eliminados
-- Vamos a recrear los triggers esenciales para recálculo automático

-- 1. TRIGGER PARA LOADS - Recálculo cuando se crean/modifican cargas
CREATE OR REPLACE TRIGGER trigger_auto_recalculate_on_loads_change
    AFTER INSERT OR UPDATE OR DELETE ON public.loads
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_loads();

-- 2. TRIGGER PARA FUEL_EXPENSES - Recálculo cuando se modifican gastos de combustible  
CREATE OR REPLACE TRIGGER trigger_auto_recalculate_on_fuel_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.fuel_expenses
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_fuel_expenses();

-- 3. TRIGGER PARA EXPENSE_INSTANCES - Recálculo cuando se modifican deducciones
CREATE OR REPLACE TRIGGER trigger_auto_recalculate_on_expense_changes
    AFTER INSERT OR UPDATE OR DELETE ON public.expense_instances
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_expense_instances();

-- 4. TRIGGER PARA APLICAR DEDUCCIONES AUTOMÁTICAMENTE
CREATE OR REPLACE TRIGGER trigger_auto_apply_expense_instance
    BEFORE INSERT ON public.expense_instances
    FOR EACH ROW
    EXECUTE FUNCTION auto_apply_expense_instance();

-- 5. TRIGGER PARA ASIGNAR PERÍODO DE PAGO A LOADS
CREATE OR REPLACE TRIGGER trigger_auto_assign_payment_period_to_load
    BEFORE INSERT OR UPDATE ON public.loads
    FOR EACH ROW
    EXECUTE FUNCTION auto_assign_payment_period_to_load();

-- Log de restauración
DO $$
BEGIN
    RAISE NOTICE '✅ TRIGGERS CRÍTICOS RESTAURADOS - Sistema de recálculo automático reactivado';
    RAISE NOTICE '   - Loads: auto_recalculate_on_loads()';
    RAISE NOTICE '   - Fuel: auto_recalculate_on_fuel_expenses()'; 
    RAISE NOTICE '   - Expenses: auto_recalculate_on_expense_instances()';
    RAISE NOTICE '   - Auto-apply: auto_apply_expense_instance()';
    RAISE NOTICE '   - Period assignment: auto_assign_payment_period_to_load()';
END $$;