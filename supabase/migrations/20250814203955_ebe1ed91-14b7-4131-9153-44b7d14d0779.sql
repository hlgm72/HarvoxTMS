-- Check current RLS policies on password_reset_tokens table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'password_reset_tokens';

-- Drop all existing conflicting policies
DROP POLICY IF EXISTS "Anyone can create reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Block all user access to password reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Service role only for password reset tokens" ON public.password_reset_tokens;
DROP POLICY IF EXISTS "Service role limited access" ON public.password_reset_tokens;

-- Ensure RLS is enabled
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- Create a single, comprehensive policy for service role only
CREATE POLICY "password_reset_tokens_service_role_only" 
ON public.password_reset_tokens 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Explicitly deny all other roles (authenticated, anon, public)
CREATE POLICY "password_reset_tokens_deny_all_users" 
ON public.password_reset_tokens 
FOR ALL 
TO public, authenticated, anon
USING (false)
WITH CHECK (false);