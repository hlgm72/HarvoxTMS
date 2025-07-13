-- Create the missing get_user_company_roles function that RLS policies depend on
CREATE OR REPLACE FUNCTION public.get_user_company_roles(user_id_param uuid)
RETURNS TABLE(company_id uuid, role user_role)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT ucr.company_id, ucr.role
  FROM public.user_company_roles ucr
  WHERE ucr.user_id = user_id_param 
  AND ucr.is_active = true;
$$;