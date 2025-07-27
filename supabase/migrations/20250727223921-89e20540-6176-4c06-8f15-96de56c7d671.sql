-- Fix cron jobs to use service_role instead of anon token

-- Remove existing cron jobs that use anon token
SELECT cron.unschedule('geotab-sync-positions');
SELECT cron.unschedule('wex-daily-sync');

-- Recreate cron jobs with service_role token (more secure)
SELECT cron.schedule(
  'geotab-sync-positions',
  '* * * * *', -- every minute
  $$
  SELECT
    net.http_post(
        url:='https://htaotttcnjxqzpsrqwll.supabase.co/functions/v1/geotab-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YW90dHRjbmp4cXpwc3Jxd2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk0MDE4NiwiZXhwIjoyMDY3NTE2MTg2fQ.pDZ-U7fZRQXrKvpMgPOcvdF4ZPc6JEt7-Z_H2KA_S5Y"}'::jsonb,
        body:='{"action": "sync-positions"}'::jsonb
    ) as request_id;
  $$
);

SELECT cron.schedule(
  'wex-daily-sync',
  '0 6 * * *', -- daily at 6 AM
  $$
  SELECT
    net.http_post(
        url:='https://htaotttcnjxqzpsrqwll.supabase.co/functions/v1/wex-auto-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YW90dHRjbmp4cXpwc3Jxd2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk0MDE4NiwiZXhwIjoyMDY3NTE2MTg2fQ.pDZ-U7fZRQXrKvpMgPOcvdF4ZPc6JEt7-Z_H2KA_S5Y"}'::jsonb,
        body:='{"timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);