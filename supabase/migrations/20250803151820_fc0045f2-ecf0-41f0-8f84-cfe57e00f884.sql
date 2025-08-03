-- Fix cron table policies that allow anonymous access
-- These are system tables but we can modify their policies

-- Fix cron.job table policy
DROP POLICY IF EXISTS cron_job_policy ON cron.job;
CREATE POLICY cron_job_policy ON cron.job
FOR ALL 
TO authenticated  -- Only authenticated users, not public
USING (username = current_user);

-- Fix cron.job_run_details table policy  
DROP POLICY IF EXISTS cron_job_run_details_policy ON cron.job_run_details;
CREATE POLICY cron_job_run_details_policy ON cron.job_run_details
FOR ALL 
TO authenticated  -- Only authenticated users, not public
USING (username = current_user);