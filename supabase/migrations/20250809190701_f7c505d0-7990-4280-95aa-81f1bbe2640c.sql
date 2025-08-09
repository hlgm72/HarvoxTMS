-- Create function to validate invitation tokens and return invitation details
CREATE OR REPLACE FUNCTION public.validate_invitation_token(token_param text)
RETURNS TABLE (
  invitation_id uuid,
  email text,
  role user_role,
  company_id uuid,
  company_name text,
  first_name text,
  last_name text,
  expires_at timestamp with time zone,
  is_valid boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ui.id as invitation_id,
    ui.email,
    ui.role,
    ui.company_id,
    c.name as company_name,
    ui.first_name,
    ui.last_name,
    ui.expires_at,
    (ui.accepted_at IS NULL AND ui.expires_at > now() AND ui.is_active = true) as is_valid
  FROM user_invitations ui
  JOIN companies c ON ui.company_id = c.id
  WHERE ui.invitation_token = token_param;
END;
$function$;