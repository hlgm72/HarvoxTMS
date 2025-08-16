-- Fix security warning: Set immutable search_path for is_user_authorized_for_company function
CREATE OR REPLACE FUNCTION public.is_user_authorized_for_company(company_id_param uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_company_roles
    WHERE user_id = auth.uid()
      AND company_id = company_id_param
      AND is_active = true
  );
$function$;