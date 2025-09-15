-- =============================================
-- ARREGLAR ESTADOS DE DEDUCCIONES EVENTUALES
-- =============================================

-- 1. ELIMINAR EL TRIGGER PROBLEMÁTICO que auto-aplica deducciones
DROP TRIGGER IF EXISTS auto_apply_expense_instance_trigger ON expense_instances;
DROP TRIGGER IF EXISTS trigger_auto_apply_expense_instance ON expense_instances;
DROP FUNCTION IF EXISTS auto_apply_expense_instance();

-- 2. CAMBIAR EL DEFAULT DEL STATUS DE VUELTA A 'planned'
ALTER TABLE expense_instances ALTER COLUMN status SET DEFAULT 'planned';

-- 3. ACTUALIZAR DEDUCCIONES QUE ESTÁN MAL MARCADAS COMO 'applied'
-- Solo cambiar a 'planned' las que están en períodos NO pagados
UPDATE expense_instances ei
SET status = 'planned'
WHERE ei.status = 'applied'
  AND EXISTS (
    SELECT 1 
    FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE dpc.id = ei.payment_period_id
      AND dpc.payment_status != 'paid'  -- No está pagado
      AND NOT cpp.is_locked             -- Período no está bloqueado
  );

-- 4. CREAR FUNCIÓN PARA CAMBIAR STATUS SOLO CUANDO SE PAGUE
CREATE OR REPLACE FUNCTION update_expense_status_on_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Cuando el payment_status cambia a 'paid', marcar todas las deducciones como 'applied'
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    UPDATE expense_instances
    SET status = 'applied', 
        applied_at = now(),
        applied_by = auth.uid()
    WHERE payment_period_id = NEW.id
      AND status = 'planned';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 5. CREAR TRIGGER PARA APLICAR DEDUCCIONES SOLO AL PAGAR
DROP TRIGGER IF EXISTS trigger_apply_expenses_on_payment ON driver_period_calculations;
CREATE TRIGGER trigger_apply_expenses_on_payment
  AFTER UPDATE ON driver_period_calculations
  FOR EACH ROW
  EXECUTE FUNCTION update_expense_status_on_payment();