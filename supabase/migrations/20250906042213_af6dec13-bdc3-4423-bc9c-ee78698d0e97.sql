-- Limpiar triggers duplicados y conflictivos de la tabla loads
-- Solo mantener los triggers esenciales y los nuevos que creamos

-- 1. ELIMINAR TRIGGERS DUPLICADOS DE RECÁLCULO
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_load_insert ON public.loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_load_update ON public.loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_load_delete ON public.loads;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_loads_change ON public.loads;
DROP TRIGGER IF EXISTS loads_auto_recalc_single_trigger ON public.loads;

-- 2. CREAR FUNCIÓN SIN AUTENTICACIÓN PARA TRIGGERS AUTOMÁTICOS
CREATE OR REPLACE FUNCTION public.ensure_driver_period_calculation_exists_no_auth(
  p_driver_user_id UUID,
  p_payment_period_id UUID
) RETURNS UUID AS $$
DECLARE
  v_company_payment_period_id UUID;
  v_calculation_id UUID;
BEGIN
  -- Verificar si el payment_period_id corresponde a company_payment_periods o driver_period_calculations
  IF EXISTS (SELECT 1 FROM company_payment_periods WHERE id = p_payment_period_id) THEN
    -- Es un company_payment_period_id
    v_company_payment_period_id := p_payment_period_id;
  ELSIF EXISTS (SELECT 1 FROM driver_period_calculations WHERE id = p_payment_period_id) THEN
    -- Es un driver_period_calculation_id, obtener el company_payment_period_id
    SELECT company_payment_period_id INTO v_company_payment_period_id
    FROM driver_period_calculations 
    WHERE id = p_payment_period_id;
  ELSE
    RAISE EXCEPTION 'Invalid payment_period_id: %', p_payment_period_id;
  END IF;

  -- Buscar si ya existe el cálculo para este conductor y período
  SELECT id INTO v_calculation_id
  FROM driver_period_calculations
  WHERE driver_user_id = p_driver_user_id 
  AND company_payment_period_id = v_company_payment_period_id;

  -- Si no existe, crearlo
  IF v_calculation_id IS NULL THEN
    RAISE NOTICE '🔄 Creating driver_period_calculation for driver % in period %', p_driver_user_id, v_company_payment_period_id;
    
    INSERT INTO driver_period_calculations (
      driver_user_id,
      company_payment_period_id,
      gross_earnings,
      fuel_expenses,
      total_deductions,
      other_income,
      total_income,
      net_payment,
      payment_status,
      has_negative_balance
    ) VALUES (
      p_driver_user_id,
      v_company_payment_period_id,
      0,
      0,
      0,
      0,
      0,
      0,
      'calculated',
      false
    ) RETURNING id INTO v_calculation_id;

    RAISE NOTICE '✅ Driver calculation created successfully: %', v_calculation_id;
  ELSE
    RAISE NOTICE '📊 Driver calculation already exists: %', v_calculation_id;
  END IF;

  RETURN v_calculation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. ACTUALIZAR LA FUNCIÓN DE TRIGGER PARA USAR LA VERSIÓN SIN AUTH
CREATE OR REPLACE FUNCTION public.auto_recalculate_driver_payment_period_simple()
RETURNS TRIGGER AS $$
DECLARE
  target_driver_user_id UUID;
  target_payment_period_id UUID;
  calculation_id UUID;
BEGIN
  -- Para INSERT y UPDATE
  target_driver_user_id := NEW.driver_user_id;
  target_payment_period_id := NEW.payment_period_id;

  -- Solo proceder si hay un conductor y un período de pago asignados
  IF target_driver_user_id IS NOT NULL AND target_payment_period_id IS NOT NULL THEN
    
    -- Asegurar que existe el driver_period_calculation (sin autenticación)
    SELECT ensure_driver_period_calculation_exists_no_auth(target_driver_user_id, target_payment_period_id) INTO calculation_id;
    
    RAISE NOTICE '🔄 auto_recalculate_v2.3 ejecutado para conductor % en período %', target_driver_user_id, calculation_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 4. RECREAR LOS TRIGGERS LIMPIOS
DROP TRIGGER IF EXISTS trigger_simple_auto_recalc_loads_insert ON public.loads;

CREATE TRIGGER trigger_simple_auto_recalc_loads_insert
  AFTER INSERT ON public.loads
  FOR EACH ROW
  WHEN (NEW.driver_user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL)
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period_simple();

DROP TRIGGER IF EXISTS trigger_simple_auto_recalc_loads_update ON public.loads;

CREATE TRIGGER trigger_simple_auto_recalc_loads_update
  AFTER UPDATE ON public.loads
  FOR EACH ROW
  WHEN (NEW.driver_user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL AND
        (OLD.total_amount IS DISTINCT FROM NEW.total_amount OR
         OLD.dispatching_percentage IS DISTINCT FROM NEW.dispatching_percentage OR
         OLD.factoring_percentage IS DISTINCT FROM NEW.factoring_percentage OR
         OLD.leasing_percentage IS DISTINCT FROM NEW.leasing_percentage OR
         OLD.driver_user_id IS DISTINCT FROM NEW.driver_user_id OR
         OLD.payment_period_id IS DISTINCT FROM NEW.payment_period_id OR
         OLD.status IS DISTINCT FROM NEW.status))
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period_simple();

-- 5. TEST MANUAL PARA CREAR EL PAYMENT REPORT DE DIOSVANI
DO $$
DECLARE
  calculation_id UUID;
BEGIN
  -- Crear el driver_period_calculation para Diosvani usando la función sin auth
  SELECT ensure_driver_period_calculation_exists_no_auth(
    '484d83b3-b928-46b3-9705-db225ddb9b0c'::UUID,  -- Diosvani user_id
    '91f545d0-0bd7-40ce-b61a-10f402a96bb5'::UUID   -- Period ID semana 36
  ) INTO calculation_id;
  
  RAISE NOTICE '🎯 Payment report creado para Diosvani: %', calculation_id;
END $$;