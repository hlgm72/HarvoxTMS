-- Eliminar los triggers problemáticos que causan recursión infinita
DROP TRIGGER IF EXISTS trigger_loads_recalculate_deductions_after_update ON loads;
DROP TRIGGER IF EXISTS trigger_loads_recalculate_deductions_after_insert ON loads;
DROP TRIGGER IF EXISTS trigger_loads_recalculate_deductions_after_delete ON loads;

-- Eliminar las funciones de trigger que causan problemas
DROP FUNCTION IF EXISTS public.trigger_recalculate_load_deductions();
DROP FUNCTION IF EXISTS public.trigger_recalculate_load_deductions_on_delete();

-- Crear una función simple para recalcular manualmente cuando sea necesario
CREATE OR REPLACE FUNCTION public.refresh_driver_period_deductions(driver_id_param uuid, period_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  calculation_id UUID;
  result JSONB;
BEGIN
  -- Buscar el cálculo del conductor para el período
  SELECT id INTO calculation_id
  FROM driver_period_calculations
  WHERE driver_user_id = driver_id_param
  AND company_payment_period_id = period_id_param;
  
  IF calculation_id IS NOT NULL THEN
    -- Recalcular los descuentos
    PERFORM generate_load_percentage_deductions(NULL, calculation_id);
    
    result := jsonb_build_object(
      'success', true,
      'message', 'Descuentos recalculados exitosamente',
      'calculation_id', calculation_id
    );
  ELSE
    result := jsonb_build_object(
      'success', false,
      'message', 'No se encontró cálculo de período para este conductor'
    );
  END IF;
  
  RETURN result;
END;
$function$;