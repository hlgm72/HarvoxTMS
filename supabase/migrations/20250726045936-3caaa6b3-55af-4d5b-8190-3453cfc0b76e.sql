-- Drop the existing function first
DROP FUNCTION IF EXISTS public.validate_invitation_token(text);

-- Create the new function with company name included
CREATE OR REPLACE FUNCTION public.validate_invitation_token(token_param text)
RETURNS TABLE(
  invitation_id uuid,
  company_id uuid,
  email text,
  role user_role,
  is_valid boolean,
  company_name text
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ui.id as invitation_id,
    ui.company_id,
    ui.email,
    ui.role,
    (ui.expires_at > now() AND ui.accepted_at IS NULL) as is_valid,
    c.name as company_name
  FROM public.user_invitations ui
  LEFT JOIN public.companies c ON ui.company_id = c.id
  WHERE ui.invitation_token = token_param;
END;
$$;