-- Crear trigger function específica para DELETE que no cause recursión
CREATE OR REPLACE FUNCTION public.trigger_recalculate_on_load_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  calculation_id UUID;
BEGIN
  -- Solo recalcular si la carga eliminada tenía conductor y período asignados
  IF OLD.driver_user_id IS NOT NULL AND OLD.payment_period_id IS NOT NULL THEN
    
    -- Buscar el cálculo del conductor para el período
    SELECT id INTO calculation_id
    FROM driver_period_calculations
    WHERE driver_user_id = OLD.driver_user_id
    AND company_payment_period_id = OLD.payment_period_id;
    
    -- Si existe el cálculo, recalcular los descuentos
    IF calculation_id IS NOT NULL THEN
      PERFORM generate_load_percentage_deductions(NULL, calculation_id);
    END IF;
    
  END IF;
  
  RETURN OLD;
END;
$function$;

-- Crear trigger específico solo para DELETE
CREATE TRIGGER trigger_loads_delete_recalculate_deductions
  AFTER DELETE ON loads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_recalculate_on_load_delete();

-- Crear también función para recálculo manual cuando sea necesario
CREATE OR REPLACE FUNCTION public.force_recalculate_driver_deductions(driver_id_param uuid, period_id_param uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  calculation_id UUID;
  result JSONB;
BEGIN
  -- Verificar permisos del usuario actual
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    JOIN company_payment_periods cpp ON ucr.company_id = cpp.company_id
    WHERE cpp.id = period_id_param
    AND ucr.user_id = auth.uid()
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  ) THEN
    RAISE EXCEPTION 'Sin permisos para recalcular descuentos en esta empresa';
  END IF;
  
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
      'calculation_id', calculation_id,
      'driver_id', driver_id_param,
      'period_id', period_id_param,
      'recalculated_at', now()
    );
  ELSE
    result := jsonb_build_object(
      'success', false,
      'message', 'No se encontró cálculo de período para este conductor',
      'driver_id', driver_id_param,
      'period_id', period_id_param
    );
  END IF;
  
  RETURN result;
END;
$function$;