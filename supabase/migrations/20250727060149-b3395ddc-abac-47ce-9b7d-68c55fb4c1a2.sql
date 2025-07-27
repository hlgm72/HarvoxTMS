-- Eliminar el trigger que está causando el error
-- Este trigger intenta crear registros en driver_period_calculations que ya no usamos
DROP TRIGGER IF EXISTS auto_recalc_on_fuel_expenses ON fuel_expenses;

-- También removemos la función si no se usa en otras partes
-- Verificamos si hay otros triggers que usen esta función
-- DROP FUNCTION IF EXISTS auto_recalculate_driver_period_totals() CASCADE;