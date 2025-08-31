-- Corregir las funciones críticas que aún referencian "payment_periods" incorrectamente

-- 1. Corregir assign_payment_period_to_load
CREATE OR REPLACE FUNCTION public.assign_payment_period_to_load(
  load_id_param uuid,
  period_id_param uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  load_record RECORD;
  period_record RECORD;
  result JSONB;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get load information
  SELECT * INTO load_record
  FROM loads
  WHERE id = load_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Carga no encontrada'
    );
  END IF;

  -- Get period information (CORREGIDO: usar company_payment_periods)
  SELECT * INTO period_record
  FROM company_payment_periods
  WHERE id = period_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Período de pago no encontrado'
    );
  END IF;

  -- Verify user has permissions in the company
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = current_user_id
    AND ucr.company_id = period_record.company_id
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Sin permisos para esta operación'
    );
  END IF;

  -- Update the load with the new payment period
  UPDATE loads
  SET 
    payment_period_id = period_id_param,
    updated_at = now(),
    updated_by = current_user_id
  WHERE id = load_id_param;

  -- Recalculate payment period totals
  PERFORM recalculate_payment_period_totals(period_id_param);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Carga asignada al período exitosamente',
    'load_id', load_id_param,
    'period_id', period_id_param,
    'assigned_by', current_user_id,
    'assigned_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error asignando carga al período: %', SQLERRM;
END;
$function$;