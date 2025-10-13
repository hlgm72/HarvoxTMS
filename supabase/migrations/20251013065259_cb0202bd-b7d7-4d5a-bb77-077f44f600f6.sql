-- Crear función create_payment_period_if_needed como alias de create_company_payment_period_if_needed
-- para mantener compatibilidad con el código frontend

CREATE OR REPLACE FUNCTION public.create_payment_period_if_needed(
  target_company_id uuid,
  target_date date,
  created_by_user_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Simplemente llamar a la función real con los mismos parámetros
  RETURN create_company_payment_period_if_needed(
    target_company_id,
    target_date,
    created_by_user_id
  );
END;
$function$;