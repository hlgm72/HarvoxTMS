
-- 🔥 ELIMINAR EL TRIGGER OBSOLETO QUE CAUSA EL ERROR
-- Este trigger todavía referencia driver_period_calculations

-- Primero eliminar los triggers
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_fuel_expenses_delete ON fuel_expenses;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_fuel_expenses_insert ON fuel_expenses;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_fuel_expenses_update ON fuel_expenses;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_loads_delete ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_loads_insert ON loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_loads_update ON loads;

-- Luego eliminar la función del trigger
DROP FUNCTION IF EXISTS public.auto_recalculate_driver_payment_period() CASCADE;

COMMENT ON TABLE fuel_expenses IS 'Los recálculos automáticos ahora se manejan dentro de create_or_update_fuel_expense_with_validation';
