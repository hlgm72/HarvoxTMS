-- Función para obtener el email de un usuario específico de manera segura
CREATE OR REPLACE FUNCTION public.get_user_email_by_id(user_id_param uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT au.email
  FROM auth.users au
  WHERE au.id = user_id_param;
$function$;