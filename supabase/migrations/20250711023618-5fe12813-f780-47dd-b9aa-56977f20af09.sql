-- Create user invitations table for Company Owner invitations
CREATE TABLE public.user_invitations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id),
  invitation_token TEXT NOT NULL UNIQUE,
  role public.user_role NOT NULL DEFAULT 'company_owner',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Superadmins can manage invitations" 
ON public.user_invitations 
FOR ALL 
USING (public.is_superadmin());

CREATE POLICY "Company owners can view their company invitations" 
ON public.user_invitations 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.user_company_roles 
    WHERE user_id = auth.uid() 
    AND role = 'company_owner' 
    AND is_active = true
  )
);

-- Create function to check if company already has an owner
CREATE OR REPLACE FUNCTION public.company_has_owner(company_id_param UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles 
    WHERE company_id = company_id_param 
    AND role = 'company_owner' 
    AND is_active = true
  );
$$;

-- Create function to validate invitation token
CREATE OR REPLACE FUNCTION public.validate_invitation_token(token_param TEXT)
RETURNS TABLE(
  invitation_id UUID,
  company_id UUID,
  email TEXT,
  role public.user_role,
  is_valid BOOLEAN
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    ui.id,
    ui.company_id,
    ui.email,
    ui.role,
    (ui.expires_at > now() AND ui.accepted_at IS NULL) as is_valid
  FROM public.user_invitations ui
  WHERE ui.invitation_token = token_param;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_user_invitations_updated_at
  BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();