-- Remove unnecessary fields from user_payrolls table
ALTER TABLE user_payrolls 
DROP COLUMN IF EXISTS has_negative_balance,
DROP COLUMN IF EXISTS balance_alert_message;

-- Add comment for documentation
COMMENT ON TABLE user_payrolls IS 'Stores payroll records for users with different employment roles (company_driver, owner_operator, dispatcher)';