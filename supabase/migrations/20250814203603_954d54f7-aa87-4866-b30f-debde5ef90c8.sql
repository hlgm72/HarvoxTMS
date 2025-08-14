-- Fix password reset tokens security vulnerability
-- Add proper RLS policies to password_reset_tokens table

-- Enable RLS if not already enabled
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow service role to manage password reset tokens
CREATE POLICY "Service role only for password reset tokens" 
ON public.password_reset_tokens 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Prevent all other access
CREATE POLICY "Block all user access to password reset tokens" 
ON public.password_reset_tokens 
FOR ALL 
TO authenticated, anon
USING (false)
WITH CHECK (false);