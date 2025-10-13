-- Crear sobrecarga de create_payment_period_if_needed que acepta 2 parámetros
-- Esta versión usa auth.uid() automáticamente como created_by_user_id

CREATE OR REPLACE FUNCTION public.create_payment_period_if_needed(
  target_company_id uuid,
  target_date date
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Llamar a la versión de 3 parámetros usando auth.uid() como created_by
  RETURN create_company_payment_period_if_needed(
    target_company_id,
    target_date,
    auth.uid()
  );
END;
$function$;