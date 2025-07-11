-- Arreglar función is_company_owner_in_company con search_path seguro
CREATE OR REPLACE FUNCTION public.is_company_owner_in_company(company_id_param uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles
    WHERE user_id = auth.uid()
    AND company_id = company_id_param
    AND role = 'company_owner'
    AND is_active = true
  );
$function$;