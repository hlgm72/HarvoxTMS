-- Crear función que automáticamente cree driver_period_calculations cuando sea necesario
CREATE OR REPLACE FUNCTION public.ensure_driver_period_calculation_exists(
  p_driver_user_id UUID,
  p_payment_period_id UUID
) RETURNS UUID AS $$
DECLARE
  v_company_payment_period_id UUID;
  v_calculation_id UUID;
  v_calc_result JSONB;
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

    -- Inmediatamente calcular los valores reales
    SELECT calculate_driver_payment_period_with_validation(v_calculation_id) INTO v_calc_result;
    
    IF (v_calc_result->>'success')::boolean = true THEN
      RAISE NOTICE '✅ Driver calculation created and calculated successfully: %', v_calculation_id;
    ELSE
      RAISE WARNING '⚠️ Driver calculation created but calculation failed: %', v_calc_result->>'message';
    END IF;
  ELSE
    RAISE NOTICE '📊 Driver calculation already exists: %', v_calculation_id;
  END IF;

  RETURN v_calculation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Actualizar la función de trigger para manejar tanto INSERT como UPDATE
CREATE OR REPLACE FUNCTION public.auto_recalculate_driver_payment_period_simple()
RETURNS TRIGGER AS $$
DECLARE
  target_driver_user_id UUID;
  target_payment_period_id UUID;
  calculation_id UUID;
  recalc_result JSONB;
BEGIN
  -- Para INSERT y UPDATE
  target_driver_user_id := NEW.driver_user_id;
  target_payment_period_id := NEW.payment_period_id;

  -- Solo proceder si hay un conductor y un período de pago asignados
  IF target_driver_user_id IS NOT NULL AND target_payment_period_id IS NOT NULL THEN
    
    -- Asegurar que existe el driver_period_calculation
    SELECT ensure_driver_period_calculation_exists(target_driver_user_id, target_payment_period_id) INTO calculation_id;
    
    -- Si existe el cálculo, recalcularlo
    IF calculation_id IS NOT NULL THEN
      RAISE NOTICE '🔄 auto_recalculate_v2.2 ejecutado para conductor % en período %', target_driver_user_id, calculation_id;
      
      -- Llamar a la función de recálculo
      SELECT calculate_driver_payment_period_with_validation(calculation_id) INTO recalc_result;
      
      IF (recalc_result->>'success')::boolean = true THEN
        RAISE NOTICE '✅ Auto-recalculation successful for period %', calculation_id;
      ELSE
        RAISE WARNING '⚠️ Auto-recalculation error: %', recalc_result->>'message';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Agregar trigger para INSERT de cargas
DROP TRIGGER IF EXISTS trigger_simple_auto_recalc_loads_insert ON public.loads;

CREATE TRIGGER trigger_simple_auto_recalc_loads_insert
  AFTER INSERT ON public.loads
  FOR EACH ROW
  WHEN (NEW.driver_user_id IS NOT NULL AND NEW.payment_period_id IS NOT NULL)
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period_simple();

-- El trigger de UPDATE ya existe, pero lo recreamos para usar la nueva función
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
         OLD.payment_period_id IS DISTINCT FROM NEW.payment_period_id))
  EXECUTE FUNCTION public.auto_recalculate_driver_payment_period_simple();

COMMENT ON FUNCTION public.ensure_driver_period_calculation_exists(UUID, UUID) IS 'Asegura que existe un driver_period_calculation para el conductor y período especificado';
COMMENT ON FUNCTION public.auto_recalculate_driver_payment_period_simple() IS 'Función mejorada v2.2 que crea automáticamente driver_period_calculations si no existen';
COMMENT ON TRIGGER trigger_simple_auto_recalc_loads_insert ON public.loads IS 'Crear automáticamente driver_period_calculations cuando se insertan cargas nuevas';
COMMENT ON TRIGGER trigger_simple_auto_recalc_loads_update ON public.loads IS 'Recalcular automáticamente cuando se editan cargas existentes';