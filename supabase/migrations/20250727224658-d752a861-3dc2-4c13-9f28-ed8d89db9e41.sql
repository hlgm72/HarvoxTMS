-- Final approach: Create restrictive policies that override the permissive ones
-- Use the fact that restrictive policies take precedence

-- Enable RLS on cron tables if not already enabled
ALTER TABLE cron.job_run_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron.job ENABLE ROW LEVEL SECURITY;

-- Create restrictive policies that deny anonymous access
-- These will override the existing permissive policies
CREATE POLICY "deny_anonymous_cron_job_run_details" 
ON cron.job_run_details 
AS RESTRICTIVE
FOR ALL 
TO public
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, true)
);

CREATE POLICY "deny_anonymous_cron_job" 
ON cron.job 
AS RESTRICTIVE
FOR ALL 
TO public
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, true)
);