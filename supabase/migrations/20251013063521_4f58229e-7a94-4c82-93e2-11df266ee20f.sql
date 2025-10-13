-- Actualizar función can_modify_financial_data_with_user_check para trabajar con esquema actual
-- La tabla company_payment_periods no tiene columna is_locked, solo verificamos estado de pago de usuarios

CREATE OR REPLACE FUNCTION public.can_modify_financial_data_with_user_check(period_id uuid, user_id_param uuid DEFAULT NULL::uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_paid BOOLEAN := false;
  total_users INTEGER := 0;
  paid_users INTEGER := 0;
  result JSONB;
BEGIN
  -- Verificar si el usuario específico ha sido pagado en este período
  IF user_id_param IS NOT NULL THEN
    SELECT COALESCE(
      (SELECT payment_status = 'paid' 
       FROM user_payment_periods upp 
       WHERE upp.user_id = user_id_param 
       AND upp.company_payment_period_id = period_id), 
      false
    ) INTO user_paid;
  END IF;
  
  -- Contar usuarios totales y pagados en este período
  SELECT 
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE payment_status = 'paid') as paid
  INTO total_users, paid_users
  FROM user_payment_periods upp
  WHERE upp.company_payment_period_id = period_id;
  
  -- Construir respuesta
  result := jsonb_build_object(
    'can_modify', NOT user_paid,
    'is_locked', false,  -- No hay columna is_locked, siempre false
    'user_is_paid', user_paid,
    'paid_users', paid_users,
    'total_users', total_users,
    'warning_message', CASE
      WHEN user_paid THEN 'Este usuario ya ha sido pagado y sus datos están protegidos'
      WHEN paid_users > 0 THEN 'Hay usuarios pagados en este período - procede con cuidado'
      ELSE 'Los datos se pueden modificar'
    END
  );
  
  RETURN result;
END;
$function$;