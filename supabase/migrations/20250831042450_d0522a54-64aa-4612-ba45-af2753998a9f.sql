-- Eliminar la función problemática que usa payment_periods
DROP FUNCTION IF EXISTS public.generate_payment_periods(uuid, timestamp with time zone, timestamp with time zone);

-- Crear una función que redirija a la función correcta que usa company_payment_periods  
CREATE OR REPLACE FUNCTION public.generate_payment_periods(
  company_id_param uuid, 
  from_date_param timestamp with time zone, 
  to_date_param timestamp with time zone
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Redirigir a la función que usa company_payment_periods correctamente
  RETURN generate_company_payment_periods_with_calculations(
    company_id_param, 
    from_date_param::date, 
    to_date_param::date,
    true
  );
END;
$function$;