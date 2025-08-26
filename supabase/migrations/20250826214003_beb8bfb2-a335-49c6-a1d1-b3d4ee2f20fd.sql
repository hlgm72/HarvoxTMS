-- Cambiar el valor por defecto de la columna status de expense_instances de 'planned' a 'applied'
ALTER TABLE expense_instances ALTER COLUMN status SET DEFAULT 'applied';

-- Crear función para auto-aplicar deducciones
CREATE OR REPLACE FUNCTION auto_apply_expense_instance()
RETURNS TRIGGER AS $$
BEGIN
  -- Si la deducción se crea sin applied_at y applied_by, establecerlos automáticamente
  IF NEW.applied_at IS NULL AND NEW.applied_by IS NULL THEN
    NEW.applied_at := now();
    NEW.applied_by := auth.uid();
  END IF;
  
  -- Si el status no se especifica o es 'planned', cambiarlo a 'applied'
  IF NEW.status IS NULL OR NEW.status = 'planned' THEN
    NEW.status := 'applied';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Crear trigger para auto-aplicar todas las deducciones nuevas
DROP TRIGGER IF EXISTS auto_apply_expense_instance_trigger ON expense_instances;
CREATE TRIGGER auto_apply_expense_instance_trigger
  BEFORE INSERT ON expense_instances
  FOR EACH ROW EXECUTE FUNCTION auto_apply_expense_instance();

-- Actualizar todas las deducciones existentes que están en status 'planned' para aplicarlas automáticamente
UPDATE expense_instances 
SET 
  status = 'applied',
  applied_at = COALESCE(applied_at, now()),
  applied_by = COALESCE(applied_by, (
    SELECT cpp.locked_by 
    FROM driver_period_calculations dpc 
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id 
    WHERE dpc.id = expense_instances.payment_period_id
    LIMIT 1
  ), (
    SELECT created_by 
    FROM expense_instances ei2 
    WHERE ei2.id = expense_instances.id 
    AND ei2.created_by IS NOT NULL
    LIMIT 1
  ), auth.uid())
WHERE status = 'planned';