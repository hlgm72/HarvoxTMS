-- Add service role policy for user_invitations table
CREATE POLICY "Service role user invitations access" 
ON user_invitations 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);