-- Corregir la función lock_payment_period

CREATE OR REPLACE FUNCTION public.lock_payment_period(
  period_id_param uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  current_user_id UUID;
  period_record RECORD;
  can_close_result JSONB;
  result JSONB;
BEGIN
  -- Get current authenticated user
  current_user_id := auth.uid();
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuario no autenticado';
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

  -- Verify user has permissions
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

  -- Check if period can be closed
  can_close_result := can_close_payment_period(period_id_param);
  
  IF NOT (can_close_result->>'can_close')::BOOLEAN THEN
    RETURN jsonb_build_object(
      'success', false,
      'message', can_close_result->>'closure_requirements',
      'details', can_close_result
    );
  END IF;

  -- Lock the period (CORREGIDO: usar company_payment_periods)
  UPDATE company_payment_periods
  SET 
    is_locked = true,
    locked_by = current_user_id,
    locked_at = now(),
    status = 'closed',
    updated_at = now()
  WHERE id = period_id_param;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Período de pago bloqueado exitosamente',
    'period_id', period_id_param,
    'locked_by', current_user_id,
    'locked_at', now()
  );

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Error bloqueando período de pago: %', SQLERRM;
END;
$function$;