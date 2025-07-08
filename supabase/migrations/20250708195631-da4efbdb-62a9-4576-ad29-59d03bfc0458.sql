-- Remove the existing 5-minute cron job
SELECT cron.unschedule('geotab-sync-positions');

-- Create a new cron job to sync vehicle positions every 1 minute
SELECT cron.schedule(
  'geotab-sync-positions',
  '* * * * *', -- Every 1 minute
  $$
  SELECT
    net.http_post(
        url:='https://htaotttcnjxqzpsrqwll.supabase.co/functions/v1/geotab-sync',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh0YW90dHRjbmp4cXpwc3Jxd2xsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTk0MDE4NiwiZXhwIjoyMDY3NTE2MTg2fQ.pDZ-U7fZRQXrKvpMgPOcvdF4ZPc6JEt7-Z_H2KA_S5Y"}'::jsonb,
        body:='{"action": "sync-positions"}'::jsonb
    ) as request_id;
  $$
);