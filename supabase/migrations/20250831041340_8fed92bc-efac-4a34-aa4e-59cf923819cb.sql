-- Corregir la función reassign_to_payment_period que también podría estar causando el error

CREATE OR REPLACE FUNCTION public.reassign_to_payment_period(
  load_id_param uuid,
  new_period_id_param uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  load_record RECORD;
  old_period_id UUID;
  new_period_record RECORD;
  result JSONB;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
  END IF;

  -- Get load and current period information
  SELECT l.*, l.payment_period_id as current_period_id
  INTO load_record
  FROM loads l
  WHERE l.id = load_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Carga no encontrada'
    );
  END IF;

  old_period_id := load_record.current_period_id;

  -- Get new period information (CORREGIDO: usar company_payment_periods)
  SELECT * INTO new_period_record
  FROM company_payment_periods
  WHERE id = new_period_id_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Nuevo período de pago no encontrado'
    );
  END IF;

  -- Verify user has permissions
  IF NOT EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = current_user_id
    AND ucr.company_id = new_period_record.company_id
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', 'Sin permisos para esta operación'
    );
  END IF;

  -- Update the load with new payment period
  UPDATE loads
  SET 
    payment_period_id = new_period_id_param,
    updated_at = now(),
    updated_by = current_user_id
  WHERE id = load_id_param;

  -- Recalculate totals for both periods
  IF old_period_id IS NOT NULL THEN
    PERFORM recalculate_payment_period_totals(old_period_id);
  END IF;
  
  PERFORM recalculate_payment_period_totals(new_period_id_param);

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Carga reasignada exitosamente',
    'load_id', load_id_param,
    'old_period_id', old_period_id,
    'new_period_id', new_period_id_param,
    'reassigned_by', current_user_id,
    'reassigned_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error reasignando carga: %', SQLERRM;
END;
$function$;