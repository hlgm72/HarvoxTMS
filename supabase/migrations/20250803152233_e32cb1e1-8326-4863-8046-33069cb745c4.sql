-- Disable anonymous sign-ins to fix RLS security warnings
-- This addresses the cron.job and cron.job_run_details anonymous access policies warnings

-- Update auth configuration to disable anonymous users
UPDATE auth.config 
SET allow_anonymous_signin = false
WHERE NOT EXISTS (
  SELECT 1 FROM auth.config WHERE allow_anonymous_signin = false
);

-- Alternative approach: Update via auth settings if the above doesn't work
-- This ensures anonymous users cannot access any tables including cron tables
INSERT INTO auth.config (allow_anonymous_signin) 
VALUES (false)
ON CONFLICT DO UPDATE SET allow_anonymous_signin = false;