-- Create password reset tokens table
CREATE TABLE public.password_reset_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 hour'),
  used_at TIMESTAMP WITH TIME ZONE NULL,
  is_used BOOLEAN NOT NULL DEFAULT false
);

-- Enable Row Level Security
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies - allow anyone to insert/select for reset flow
CREATE POLICY "Anyone can create reset tokens" 
ON public.password_reset_tokens 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can read unexpired tokens" 
ON public.password_reset_tokens 
FOR SELECT 
USING (expires_at > now() AND is_used = false);

-- Create function to validate reset token
CREATE OR REPLACE FUNCTION public.validate_reset_token(token_param text)
RETURNS TABLE(
  id uuid, 
  user_email text, 
  is_valid boolean,
  expires_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT 
    prt.id,
    prt.user_email,
    (prt.expires_at > now() AND prt.is_used = false) as is_valid,
    prt.expires_at
  FROM public.password_reset_tokens prt
  WHERE prt.token = token_param;
$$;

-- Create function to mark token as used
CREATE OR REPLACE FUNCTION public.use_reset_token(token_param text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  token_record RECORD;
BEGIN
  -- Get and validate token
  SELECT * INTO token_record 
  FROM public.password_reset_tokens 
  WHERE token = token_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'Token not found');
  END IF;
  
  IF token_record.expires_at <= now() THEN
    RETURN jsonb_build_object('success', false, 'message', 'Token expired');
  END IF;
  
  IF token_record.is_used THEN
    RETURN jsonb_build_object('success', false, 'message', 'Token already used');
  END IF;
  
  -- Mark token as used
  UPDATE public.password_reset_tokens 
  SET is_used = true, used_at = now()
  WHERE token = token_param;
  
  RETURN jsonb_build_object(
    'success', true, 
    'user_email', token_record.user_email,
    'message', 'Token validated successfully'
  );
END;
$$;

-- Create function to clean up expired tokens (run this periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_reset_tokens()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
AS $$
  DELETE FROM public.password_reset_tokens 
  WHERE expires_at <= now() - interval '24 hours'
  RETURNING 1;
$$;

-- Create index for performance
CREATE INDEX idx_password_reset_tokens_token ON public.password_reset_tokens(token);
CREATE INDEX idx_password_reset_tokens_email ON public.password_reset_tokens(user_email);
CREATE INDEX idx_password_reset_tokens_expires ON public.password_reset_tokens(expires_at);