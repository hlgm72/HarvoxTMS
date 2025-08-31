-- =========================================
-- SOLUCIÓN: Agregar trigger para recálculo automático de combustible
-- =========================================

-- Primero, verificar que la función de recálculo existe y crear el trigger
CREATE OR REPLACE TRIGGER auto_recalc_fuel_expenses_trigger
    AFTER INSERT OR UPDATE OR DELETE ON fuel_expenses
    FOR EACH ROW
    EXECUTE FUNCTION auto_recalculate_on_fuel_expenses();

-- También necesitamos recalcular los períodos afectados ahora
-- (esto se ejecutará una vez para arreglar los datos actuales)