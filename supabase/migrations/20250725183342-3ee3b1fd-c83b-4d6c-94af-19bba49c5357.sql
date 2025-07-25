-- Enable required extensions for cron jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create cron job for daily WEX sync at 6 AM
SELECT cron.schedule(
  'wex-daily-sync',
  '0 6 * * *', -- Every day at 6 AM
  $$
  SELECT
    net.http_post(
        url:='https://htaotttcnjxqzpsrqwll.supabase.co/functions/v1/wex-auto-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YW90dHRjbmp4cXpwc3Jxd2xsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE5NDAxODYsImV4cCI6MjA2NzUxNjE4Nn0.IIMiQ3AeGhvWAlzVR5w1eO8SQMKlZzym0FfPK0ez5Pw"}'::jsonb,
        body:='{"timestamp": "' || now() || '"}'::jsonb
    ) as request_id;
  $$
);