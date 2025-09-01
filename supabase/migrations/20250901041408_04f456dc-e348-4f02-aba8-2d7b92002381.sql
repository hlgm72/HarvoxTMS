-- 🚨 FUNCIÓN DE EMERGENCIA: Eliminar período problemático de semana 36
-- Solo eliminar si no tiene transacciones asociadas

CREATE OR REPLACE FUNCTION public.emergency_cleanup_week36_period()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_user_id UUID;
  problematic_period_id UUID := '92b2e04b-e4a5-4193-9197-88538055a43a';
  has_loads INTEGER := 0;
  has_fuel_expenses INTEGER := 0;
  has_calculations INTEGER := 0;
  result JSONB;
BEGIN
  -- Verificar usuario autenticado
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Verificar si el período tiene datos asociados
  SELECT COUNT(*) INTO has_loads
  FROM loads 
  WHERE payment_period_id = problematic_period_id;

  SELECT COUNT(*) INTO has_fuel_expenses
  FROM fuel_expenses 
  WHERE payment_period_id = problematic_period_id;

  SELECT COUNT(*) INTO has_calculations
  FROM driver_period_calculations 
  WHERE company_payment_period_id = problematic_period_id;

  -- Si tiene datos, no eliminar
  IF has_loads > 0 OR has_fuel_expenses > 0 OR has_calculations > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'No se puede eliminar: período tiene datos asociados',
      'data_found', jsonb_build_object(
        'loads', has_loads,
        'fuel_expenses', has_fuel_expenses,
        'calculations', has_calculations
      )
    );
  END IF;

  -- Eliminar el período problemático si está vacío
  DELETE FROM company_payment_periods 
  WHERE id = problematic_period_id 
  AND period_start_date = '2025-09-01';

  -- Log de la operación
  RAISE LOG 'emergency_cleanup_week36_period: Eliminated problematic period % by user %', 
    problematic_period_id, current_user_id;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Período de semana 36 eliminado exitosamente',
    'period_id', problematic_period_id,
    'deleted_by', current_user_id,
    'deleted_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error limpiando período semana 36: %', SQLERRM;
END;
$$;

-- Función para prevenir creación de períodos futuros innecesarios
CREATE OR REPLACE FUNCTION public.prevent_future_period_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  max_future_date DATE := CURRENT_DATE + INTERVAL '7 days';
BEGIN
  -- Solo permitir períodos hasta 1 semana en el futuro
  IF NEW.period_start_date > max_future_date THEN
    RAISE EXCEPTION 'ERROR_PERIOD_TOO_FAR_FUTURE: No se pueden crear períodos que inicien después del %', max_future_date;
  END IF;

  -- Log para auditoria
  RAISE LOG 'prevent_future_period_creation: Period % validated for dates %-% (within limit: %)', 
    NEW.id, NEW.period_start_date, NEW.period_end_date, max_future_date;

  RETURN NEW;
END;
$$;

-- Aplicar el trigger de prevención
DROP TRIGGER IF EXISTS prevent_future_periods_trigger ON company_payment_periods;
CREATE TRIGGER prevent_future_periods_trigger
  BEFORE INSERT ON company_payment_periods
  FOR EACH ROW
  EXECUTE FUNCTION prevent_future_period_creation();