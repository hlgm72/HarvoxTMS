-- Reset load 25-384 status using RPC function
SELECT update_load_status_with_validation(
  '11ce7d16-ae27-4a03-bfb7-72f68b9943f2'::uuid,
  'assigned',
  NULL,
  NULL,
  NULL,
  true
);