
-- Remove redundant user_role column from user_payrolls table
-- The user role is already stored in user_company_roles table

ALTER TABLE user_payrolls DROP COLUMN IF EXISTS user_role;

-- Add comment for documentation
COMMENT ON TABLE user_payrolls IS 'User payment calculations per period. User roles are managed in user_company_roles table.';
