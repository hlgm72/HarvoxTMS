-- Arreglar la función auto_apply_expense_instance con search_path seguro
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';