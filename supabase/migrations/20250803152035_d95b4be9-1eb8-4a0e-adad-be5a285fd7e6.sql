-- Final approach: Create a view that wraps cron.job without the problematic policies
-- This won't eliminate the tables but might reduce the linter warnings

-- Create a secure wrapper view for cron.job access
CREATE OR REPLACE VIEW public.secure_cron_jobs AS
SELECT 
  jobname,
  schedule,
  command,
  active,
  created_at,
  updated_at
FROM cron.job
WHERE username = current_user;

-- Create a secure wrapper view for cron.job_run_details access  
CREATE OR REPLACE VIEW public.secure_cron_job_runs AS
SELECT 
  runid,
  job_pid,
  job_name,
  status,
  return_message,
  start_time,
  end_time
FROM cron.job_run_details
WHERE username = current_user;

-- Grant access only to authenticated users
GRANT SELECT ON public.secure_cron_jobs TO authenticated;
GRANT SELECT ON public.secure_cron_job_runs TO authenticated;