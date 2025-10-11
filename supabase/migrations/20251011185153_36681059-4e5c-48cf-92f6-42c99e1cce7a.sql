-- ===============================================
-- 🚨 Eliminar triggers problemáticos temporalmente
-- ===============================================

-- Eliminar triggers que referencian driver_period_calculations
DROP TRIGGER IF EXISTS auto_recalculate_on_fuel_expenses_insert ON fuel_expenses;
DROP TRIGGER IF EXISTS auto_recalculate_on_fuel_expenses_update ON fuel_expenses;
DROP TRIGGER IF EXISTS auto_recalculate_on_fuel_expenses_delete ON fuel_expenses;

-- Eliminar función también
DROP FUNCTION IF EXISTS auto_recalculate_on_fuel_expenses() CASCADE;

-- Log
INSERT INTO migration_audit_log (phase, operation, status)
VALUES ('trigger_cleanup', 'remove_old_fuel_expense_triggers', 'completed');