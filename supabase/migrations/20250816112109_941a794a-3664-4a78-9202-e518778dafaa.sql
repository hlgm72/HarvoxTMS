-- Remove unnecessary companies_public view
-- The main companies table already has proper RLS policies

DROP VIEW IF EXISTS companies_public;

-- Add comment to document the simplification
COMMENT ON TABLE companies IS 'Company information with proper RLS policies. Removed companies_public view as it was redundant and causing confusion with empty results.';