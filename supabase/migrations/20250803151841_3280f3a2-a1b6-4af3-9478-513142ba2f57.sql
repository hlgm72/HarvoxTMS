-- Alternative approach: Try to revoke permissions from public role on cron tables
-- This might work even if we can't modify the policies directly

REVOKE ALL ON cron.job FROM public;
REVOKE ALL ON cron.job_run_details FROM public;

-- Grant only to authenticated users if needed
GRANT SELECT ON cron.job TO authenticated;
GRANT SELECT ON cron.job_run_details TO authenticated;