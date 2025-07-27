-- Check and fix cron table policies that allow anonymous access

-- First, let's see what policies exist on cron tables
SELECT schemaname, tablename, policyname, cmd, permissive, roles, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'cron';

-- Drop any policies that might allow anonymous access on cron.job
DROP POLICY IF EXISTS "cron_job_policy" ON cron.job;

-- Drop any policies that might allow anonymous access on cron.job_run_details  
DROP POLICY IF EXISTS "cron_job_run_details_policy" ON cron.job_run_details;

-- Create restrictive policies that only allow service_role access
CREATE POLICY "service_role_only_cron_job" 
ON cron.job 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

CREATE POLICY "service_role_only_cron_job_run_details" 
ON cron.job_run_details 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Ensure RLS is enabled on these tables
ALTER TABLE cron.job ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron.job_run_details ENABLE ROW LEVEL SECURITY;