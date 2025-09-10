-- Recrear el trigger correctamente (sin el RAISE NOTICE al final)
-- Primero eliminar trigger existente
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_load_changes ON loads;

-- Recrear la función del trigger con mejor debugging
CREATE OR REPLACE FUNCTION auto_recalculate_driver_payment_period_simple()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  calculation_id UUID;
  calc_result JSONB;
BEGIN
  RAISE NOTICE 'TRIGGER: ===== EJECUTANDO TRIGGER EN LOADS =====';
  RAISE NOTICE 'TRIGGER: Load: %, Driver: %, Period: %', 
    COALESCE(NEW.load_number, 'unknown'), 
    COALESCE(NEW.driver_user_id::text, 'NULL'), 
    COALESCE(NEW.payment_period_id::text, 'NULL');
  
  -- Solo procesar si tenemos driver y período
  IF NEW.driver_user_id IS NULL OR NEW.payment_period_id IS NULL THEN
    RAISE NOTICE 'TRIGGER: ❌ Saltando - sin driver o período asignado';
    RETURN NEW;
  END IF;

  RAISE NOTICE 'TRIGGER: ✅ Condiciones cumplidas, procediendo con cálculo';

  -- 1. ASEGURAR QUE EXISTE EL DRIVER_PERIOD_CALCULATION
  BEGIN
    SELECT ensure_driver_period_calculation_exists(
      NEW.driver_user_id,
      NEW.payment_period_id
    ) INTO calculation_id;

    RAISE NOTICE 'TRIGGER: Driver calculation ID obtenido: %', calculation_id;

    -- 2. EJECUTAR EL CÁLCULO REAL INMEDIATAMENTE
    IF calculation_id IS NOT NULL THEN
      SELECT calculate_driver_payment_no_auth(calculation_id) INTO calc_result;
      
      IF (calc_result->>'success')::boolean THEN
        RAISE NOTICE 'TRIGGER: ✅ Cálculo completado exitosamente - Net: $%', 
          calc_result->>'net_payment';
      ELSE
        RAISE NOTICE 'TRIGGER: ❌ Error en cálculo: %', calc_result->>'error';
      END IF;
    ELSE
      RAISE NOTICE 'TRIGGER: ❌ No se pudo crear/encontrar driver_period_calculation';
    END IF;

  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'TRIGGER: ❌ Excepción en trigger: %', SQLERRM;
  END;

  RAISE NOTICE 'TRIGGER: ===== FIN TRIGGER EN LOADS =====';
  RETURN NEW;
END;
$$;

-- Recrear el trigger
CREATE TRIGGER trigger_auto_recalculate_on_load_changes
  AFTER INSERT OR UPDATE
  ON loads
  FOR EACH ROW
  EXECUTE FUNCTION auto_recalculate_driver_payment_period_simple();