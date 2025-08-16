-- Remove companies_financial view as it's no longer needed
-- The main companies table now has optimized RLS policies that handle access control

DROP VIEW IF EXISTS companies_financial;
DROP VIEW IF EXISTS companies_public;

-- Add comment to companies table documenting the change
COMMENT ON TABLE companies IS 'Company information with optimized RLS policies for performance and security. Direct table access replaces previous view-based approach.';