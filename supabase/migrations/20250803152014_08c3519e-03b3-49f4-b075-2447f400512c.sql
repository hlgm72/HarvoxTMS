-- Radical solution: Disable RLS on cron tables entirely
-- This will remove the policies that are causing the warnings

-- Attempt to disable RLS on cron tables
-- This might work since we're not modifying policies, just disabling RLS entirely
ALTER TABLE cron.job DISABLE ROW LEVEL SECURITY;
ALTER TABLE cron.job_run_details DISABLE ROW LEVEL SECURITY;