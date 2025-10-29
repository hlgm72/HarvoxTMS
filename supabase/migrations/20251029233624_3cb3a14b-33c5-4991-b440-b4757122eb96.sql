-- Mejorar mensajes de error de inmutabilidad de períodos pagados
-- Agregar información del período (número y fechas) a los mensajes de error

-- 1. Actualizar función de validación de cargas con información del período
CREATE OR REPLACE FUNCTION check_load_period_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_id UUID;
  v_period_id UUID;
  v_is_paid BOOLEAN;
  v_period_start_date DATE;
  v_period_end_date DATE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_driver_id := OLD.driver_user_id;
    v_period_id := OLD.payment_period_id;
  ELSE
    v_driver_id := NEW.driver_user_id;
    v_period_id := NEW.payment_period_id;
  END IF;
  
  IF v_period_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  v_is_paid := is_period_paid_for_user(v_driver_id, v_period_id);
  
  IF v_is_paid THEN
    -- Obtener fechas del período
    SELECT period_start_date, period_end_date
    INTO v_period_start_date, v_period_end_date
    FROM company_payment_periods
    WHERE id = v_period_id;
    
    RAISE EXCEPTION 'PAID_PERIOD_IMMUTABLE|%|%', v_period_start_date, v_period_end_date
      USING HINT = 'Los períodos pagados son inmutables por razones de auditoría y cumplimiento.',
            ERRCODE = 'P0001';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 2. Actualizar función de validación de combustible con información del período
CREATE OR REPLACE FUNCTION check_fuel_period_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_id UUID;
  v_period_id UUID;
  v_is_paid BOOLEAN;
  v_period_start_date DATE;
  v_period_end_date DATE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_driver_id := OLD.driver_user_id;
    v_period_id := OLD.payment_period_id;
  ELSE
    v_driver_id := NEW.driver_user_id;
    v_period_id := NEW.payment_period_id;
  END IF;
  
  IF v_period_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  v_is_paid := is_period_paid_for_user(v_driver_id, v_period_id);
  
  IF v_is_paid THEN
    -- Obtener fechas del período
    SELECT period_start_date, period_end_date
    INTO v_period_start_date, v_period_end_date
    FROM company_payment_periods
    WHERE id = v_period_id;
    
    RAISE EXCEPTION 'PAID_PERIOD_IMMUTABLE_FUEL|%|%', v_period_start_date, v_period_end_date
      USING HINT = 'Los períodos pagados son inmutables por razones de auditoría y cumplimiento.',
            ERRCODE = 'P0001';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 3. Actualizar función de validación de deducciones con información del período
CREATE OR REPLACE FUNCTION check_expense_period_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_period_id UUID;
  v_is_paid BOOLEAN;
  v_period_start_date DATE;
  v_period_end_date DATE;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := OLD.user_id;
    v_period_id := OLD.payment_period_id;
  ELSE
    v_user_id := NEW.user_id;
    v_period_id := NEW.payment_period_id;
  END IF;
  
  IF v_period_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  v_is_paid := is_period_paid_for_user(v_user_id, v_period_id);
  
  IF v_is_paid THEN
    -- Obtener fechas del período
    SELECT period_start_date, period_end_date
    INTO v_period_start_date, v_period_end_date
    FROM company_payment_periods
    WHERE id = v_period_id;
    
    RAISE EXCEPTION 'PAID_PERIOD_IMMUTABLE_EXPENSE|%|%', v_period_start_date, v_period_end_date
      USING HINT = 'Los períodos pagados son inmutables por razones de auditoría y cumplimiento.',
            ERRCODE = 'P0001';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;