-- Setup automatic archiving with cron job
-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create scheduled job to check for archiving needs daily at 2 AM
SELECT cron.schedule(
  'daily-archive-check',
  '0 2 * * *', -- Every day at 2 AM
  $$
  SELECT
    net.http_post(
        url:='https://htaotttcnjxqzpsrqwll.supabase.co/functions/v1/archive-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YW90dHRjbmp4cXpwc3Jxd2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NDAxODYsImV4cCI6MjA2NzUxNjE4Nn0.IIMiQ3AeGhvWAlzVR5w1eO8SQMKlZzym0FfPK0ez5Pw"}'::jsonb,
        body:='{"operation": "check", "notify": true}'::jsonb
    ) as request_id;
  $$
);

-- Create weekly job to execute archiving if needed (Sundays at 3 AM)
SELECT cron.schedule(
  'weekly-archive-execution',
  '0 3 * * 0', -- Every Sunday at 3 AM
  $$
  SELECT
    net.http_post(
        url:='https://htaotttcnjxqzpsrqwll.supabase.co/functions/v1/archive-scheduler',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YW90dHRjbmp4cXpwc3Jxd2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NDAxODYsImV4cCI6MjA2NzUxNjE4Nn0.IIMiQ3AeGhvWAlzVR5w1eO8SQMKlZzym0FfPK0ez5Pw"}'::jsonb,
        body:='{"operation": "execute", "notify": true}'::jsonb
    ) as request_id;
  $$
);