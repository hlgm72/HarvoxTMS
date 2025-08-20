-- Crear trigger para recálculo automático de gastos de combustible
-- Este trigger se ejecutará después de INSERT, UPDATE o DELETE en fuel_expenses
-- para recalcular automáticamente los totales del período de pago

CREATE TRIGGER trigger_auto_recalculate_on_fuel_expenses
  AFTER INSERT OR UPDATE OR DELETE ON fuel_expenses
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_on_fuel_expenses();

-- Agregar comentario para documentar el propósito del trigger
COMMENT ON TRIGGER trigger_auto_recalculate_on_fuel_expenses ON fuel_expenses IS 
'Recalcula automáticamente los totales del período de pago cuando se modifican gastos de combustible';