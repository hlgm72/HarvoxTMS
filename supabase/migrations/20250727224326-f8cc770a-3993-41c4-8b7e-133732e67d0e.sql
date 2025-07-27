-- Alternative approach: Recreate pg_cron extension with secure policies
-- Drop and recreate the extension to get clean policies

-- First, save any existing cron jobs
CREATE TEMP TABLE temp_cron_jobs AS 
SELECT * FROM cron.job;

-- Drop the extension completely
DROP EXTENSION IF EXISTS pg_cron CASCADE;

-- Recreate the extension  
CREATE EXTENSION pg_cron;

-- Now we should be able to modify the policies since we just created them
-- Drop the default policies that allow public access
DROP POLICY IF EXISTS "cron_job_policy" ON cron.job;
DROP POLICY IF EXISTS "cron_job_run_details_policy" ON cron.job_run_details;

-- Create secure policies that only allow authenticated users
CREATE POLICY "secure_cron_job_policy" 
ON cron.job 
FOR ALL 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, true)
);

CREATE POLICY "secure_cron_job_run_details_policy" 
ON cron.job_run_details 
FOR ALL 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, true)
);

-- Restore the cron jobs we saved
INSERT INTO cron.job (jobid, schedule, command, nodename, nodeport, database, username, active, jobname)
SELECT jobid, schedule, command, nodename, nodeport, database, username, active, jobname
FROM temp_cron_jobs;