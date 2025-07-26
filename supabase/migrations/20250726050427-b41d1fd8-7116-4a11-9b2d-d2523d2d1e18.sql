-- Agregar campos de nombre y apellido a user_invitations
ALTER TABLE public.user_invitations 
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

-- Actualizar la función validate_invitation_token para incluir nombre y apellido
DROP FUNCTION IF EXISTS public.validate_invitation_token(text);

CREATE OR REPLACE FUNCTION public.validate_invitation_token(token_param text)
RETURNS TABLE(
  invitation_id uuid,
  company_id uuid,
  email text,
  role user_role,
  is_valid boolean,
  company_name text,
  first_name text,
  last_name text
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
    c.name as company_name,
    ui.first_name,
    ui.last_name
  FROM public.user_invitations ui
  LEFT JOIN public.companies c ON ui.company_id = c.id
  WHERE ui.invitation_token = token_param;
END;
$$;