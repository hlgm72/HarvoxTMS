-- Add immutable column to company_payment_periods table
-- This column is used to mark payment periods as closed and prevent modifications

ALTER TABLE company_payment_periods 
ADD COLUMN IF NOT EXISTS immutable BOOLEAN NOT NULL DEFAULT false;

-- Add index for performance when checking immutability
CREATE INDEX IF NOT EXISTS idx_company_payment_periods_immutable 
ON company_payment_periods(id, immutable) 
WHERE immutable = true;

COMMENT ON COLUMN company_payment_periods.immutable IS 'Indicates if the payment period is closed and cannot be modified. Set to true when period is finalized and paid.';