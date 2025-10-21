-- Remove redundant status field from user_payrolls table
-- payment_status is sufficient for tracking payment state
ALTER TABLE user_payrolls 
DROP COLUMN IF EXISTS status;

-- Add documentation comment
COMMENT ON COLUMN user_payrolls.payment_status IS 'Payment state: pending, processing, paid, cancelled';