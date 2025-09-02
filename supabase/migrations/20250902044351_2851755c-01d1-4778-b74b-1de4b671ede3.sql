-- Completely delete period 35 (week 35, year 2025) and all associated data
-- This includes the period itself, all driver calculations, and all deduction instances

SELECT cleanup_period_and_orphaned_data(
  target_company_id := 'e5d52767-ca59-4c28-94e4-058aff6a037b'::uuid,
  week_number := 35,
  year_number := 2025
);