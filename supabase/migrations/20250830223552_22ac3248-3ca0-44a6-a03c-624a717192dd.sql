-- Corregir warning de seguridad: agregar search_path a la función
CREATE OR REPLACE FUNCTION auto_assign_payment_period_to_load()
RETURNS TRIGGER AS $$
DECLARE
  company_criteria TEXT;
  target_date DATE;
  matching_period_id UUID;
BEGIN
  -- Obtener el criterio de asignación de la empresa
  SELECT load_assignment_criteria INTO company_criteria
  FROM companies 
  WHERE id = NEW.company_id;
  
  -- Si no hay criterio definido, usar delivery_date por defecto
  IF company_criteria IS NULL THEN
    company_criteria := 'delivery_date';
  END IF;
  
  -- Determinar qué fecha usar según el criterio de la empresa
  CASE company_criteria
    WHEN 'pickup_date' THEN
      target_date := NEW.pickup_date;
    WHEN 'assigned_date' THEN
      target_date := NEW.created_at::DATE;
    ELSE -- 'delivery_date' por defecto
      target_date := NEW.delivery_date;
  END CASE;
  
  -- Solo proceder si tenemos una fecha válida
  IF target_date IS NOT NULL THEN
    -- Buscar período de pago que contenga la fecha objetivo
    SELECT id INTO matching_period_id
    FROM company_payment_periods
    WHERE company_id = NEW.company_id
      AND period_start_date <= target_date
      AND period_end_date >= target_date
      AND status IN ('open', 'processing')
    ORDER BY period_start_date DESC
    LIMIT 1;
    
    -- Asignar el período encontrado
    IF matching_period_id IS NOT NULL THEN
      NEW.payment_period_id := matching_period_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';