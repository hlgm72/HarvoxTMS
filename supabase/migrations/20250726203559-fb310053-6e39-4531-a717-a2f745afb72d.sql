-- Actualizar la función is_period_locked para usar la tabla correcta
CREATE OR REPLACE FUNCTION public.is_period_locked(period_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(is_locked, false) 
  FROM public.company_payment_periods 
  WHERE id = period_id;
$function$;