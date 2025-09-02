-- Delete week 35 period completely using the cleanup function
SELECT cleanup_period_and_orphaned_data(
  'e5d52767-ca59-4c28-94e4-058aff6a037b'::uuid, -- company_id
  35, -- week_number
  2025 -- year_number
);