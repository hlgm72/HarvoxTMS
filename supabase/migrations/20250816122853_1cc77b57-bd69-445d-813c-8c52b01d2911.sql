-- Fix performance warnings: Consolidate overlapping RLS policies
-- Remove redundant policies since companies_ultra_secure_access handles all operations

-- Drop the old specific policies that overlap with our comprehensive policy
DROP POLICY IF EXISTS "companies_superadmin_delete_only" ON companies;
DROP POLICY IF EXISTS "companies_superadmin_insert_only" ON companies;
DROP POLICY IF EXISTS "companies_owners_and_superadmin_update" ON companies;

-- The companies_ultra_secure_access policy already handles all operations
-- with the most restrictive and secure logic, so these old policies are redundant