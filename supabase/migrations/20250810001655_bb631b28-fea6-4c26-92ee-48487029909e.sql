-- Add columns to user_invitations table to support pre-registration
ALTER TABLE user_invitations 
ADD COLUMN IF NOT EXISTS target_user_id UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_invitations_target_user_id ON user_invitations(target_user_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_company_role ON user_invitations(company_id, role);