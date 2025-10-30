-- Fix: Remove AFTER DELETE triggers on loads table that conflict with delete_load_with_validation
-- The delete_load_with_validation function handles all cleanup manually, these triggers cause conflicts

-- Remove cleanup triggers that try to delete periods/payrolls after the function already did
DROP TRIGGER IF EXISTS trigger_cleanup_empty_period_after_load_delete ON loads;
DROP TRIGGER IF EXISTS trigger_cleanup_payroll_after_load_delete ON loads;

-- Remove the recalculation trigger that runs after DELETE
-- It tries to recalculate payrolls that were already deleted by delete_load_with_validation
DROP TRIGGER IF EXISTS trigger_recalc_on_load_change ON loads;

-- Recreate the recalculation trigger ONLY for INSERT and UPDATE (not DELETE)
CREATE TRIGGER trigger_recalc_on_load_change
AFTER INSERT OR UPDATE ON loads
FOR EACH ROW
EXECUTE FUNCTION trigger_recalculate_user_payroll_on_load_change();

-- Also remove similar triggers from fuel_expenses that might conflict
DROP TRIGGER IF EXISTS trigger_cleanup_empty_period_after_fuel_delete ON fuel_expenses;
DROP TRIGGER IF EXISTS trigger_cleanup_payroll_after_fuel_delete ON fuel_expenses;