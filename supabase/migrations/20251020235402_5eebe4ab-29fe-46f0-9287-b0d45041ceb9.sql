-- Create enum type for payroll roles
CREATE TYPE payroll_role_type AS ENUM ('company_driver', 'owner_operator', 'dispatcher');

-- Add payroll_role column to user_payrolls table
ALTER TABLE user_payrolls 
ADD COLUMN payroll_role payroll_role_type;

-- Update existing records to 'owner_operator' (current implementation)
UPDATE user_payrolls 
SET payroll_role = 'owner_operator' 
WHERE payroll_role IS NULL;

-- Make the column NOT NULL after updating existing records
ALTER TABLE user_payrolls 
ALTER COLUMN payroll_role SET NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN user_payrolls.payroll_role IS 'Specifies which role of the user applies to this payroll record: company_driver, owner_operator, or dispatcher';

-- Create index for better query performance
CREATE INDEX idx_user_payrolls_payroll_role ON user_payrolls(payroll_role);