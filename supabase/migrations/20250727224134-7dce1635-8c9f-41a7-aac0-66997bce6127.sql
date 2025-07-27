-- Remove the specific policies that allow public (including anonymous) access
-- These policies use (username = CURRENT_USER) but are applied to 'public' role

-- Check if we have permission to drop these specific policies
-- If we have the pg_cron extension enabled, we might be able to modify these

-- Try to revoke public access from these tables first
REVOKE ALL ON cron.job FROM public;
REVOKE ALL ON cron.job_run_details FROM public;

-- Try to drop the problematic policies
DROP POLICY IF EXISTS "cron_job_policy" ON cron.job;
DROP POLICY IF EXISTS "cron_job_run_details_policy" ON cron.job_run_details;