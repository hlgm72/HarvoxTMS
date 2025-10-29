
-- Corrección de seguridad: Agregar search_path a las funciones de inmutabilidad
-- Esto previene vulnerabilidades de seguridad relacionadas con manipulación de search_path

-- 1. Recrear función helper con search_path
CREATE OR REPLACE FUNCTION is_period_paid_for_user(
  p_user_id UUID,
  p_period_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_is_paid BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1 
    FROM user_payrolls 
    WHERE user_id = p_user_id 
      AND company_payment_period_id = p_period_id
      AND payment_status = 'paid'
  ) INTO v_is_paid;
  
  RETURN v_is_paid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path = public;

-- 2. Recrear función de validación de cargas con search_path
CREATE OR REPLACE FUNCTION check_load_period_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_id UUID;
  v_period_id UUID;
  v_is_paid BOOLEAN;
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
    RAISE EXCEPTION 'No se pueden modificar datos de un período pagado. El payroll del conductor para este período ya fue procesado y pagado.'
      USING HINT = 'Los períodos pagados son inmutables por razones de auditoría y cumplimiento.',
            ERRCODE = 'P0001';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 3. Recrear función de validación de combustible con search_path
CREATE OR REPLACE FUNCTION check_fuel_period_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_driver_id UUID;
  v_period_id UUID;
  v_is_paid BOOLEAN;
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
    RAISE EXCEPTION 'No se pueden modificar gastos de combustible de un período pagado. El payroll del conductor para este período ya fue procesado y pagado.'
      USING HINT = 'Los períodos pagados son inmutables por razones de auditoría y cumplimiento.',
            ERRCODE = 'P0001';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- 4. Recrear función de validación de deducciones con search_path
CREATE OR REPLACE FUNCTION check_expense_period_immutability()
RETURNS TRIGGER AS $$
DECLARE
  v_user_id UUID;
  v_period_id UUID;
  v_is_paid BOOLEAN;
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
    RAISE EXCEPTION 'No se pueden modificar deducciones de un período pagado. El payroll del usuario para este período ya fue procesado y pagado.'
      USING HINT = 'Los períodos pagados son inmutables por razones de auditoría y cumplimiento.',
            ERRCODE = 'P0001';
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Vulnerabilidades de search_path corregidas';
  RAISE NOTICE '🔒 Todas las funciones de inmutabilidad ahora tienen search_path = public';
END $$;
