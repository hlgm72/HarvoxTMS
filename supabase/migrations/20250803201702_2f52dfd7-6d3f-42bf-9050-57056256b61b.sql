-- Create a security definer function to safely get user emails for admins
CREATE OR REPLACE FUNCTION public.get_user_emails_for_company(company_id_param uuid)
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ucr.user_id,
    au.email
  FROM user_company_roles ucr
  JOIN auth.users au ON ucr.user_id = au.id
  WHERE ucr.company_id = company_id_param
    AND ucr.is_active = true
    AND (
      -- Only allow if current user is admin in this company
      EXISTS (
        SELECT 1 FROM user_company_roles
        WHERE user_id = auth.uid()
          AND company_id = company_id_param
          AND role IN ('company_owner', 'operations_manager', 'superadmin')
          AND is_active = true
      )
      -- Or if getting own email
      OR ucr.user_id = auth.uid()
    );
$$;