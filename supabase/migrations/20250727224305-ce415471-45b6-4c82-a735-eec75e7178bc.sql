-- Use superuser privileges to fix cron table security issues
-- We need to be more direct about this

-- First, let's check our current privileges
SELECT current_user, session_user;

-- Connect as postgres superuser and modify the cron policies
SET ROLE postgres;

-- Now drop the problematic policies that allow public access
DROP POLICY IF EXISTS "cron_job_policy" ON cron.job;
DROP POLICY IF EXISTS "cron_job_run_details_policy" ON cron.job_run_details;

-- Create new, more restrictive policies that don't allow anonymous access
CREATE POLICY "authenticated_users_only_cron_job" 
ON cron.job 
FOR ALL 
TO authenticated
USING (username = current_user);

CREATE POLICY "authenticated_users_only_cron_job_run_details" 
ON cron.job_run_details 
FOR ALL 
TO authenticated  
USING (username = current_user);

-- Reset role
RESET ROLE;