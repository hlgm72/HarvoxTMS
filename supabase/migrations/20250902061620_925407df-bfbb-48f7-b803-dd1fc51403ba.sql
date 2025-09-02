-- Fix deductions accumulation issue by removing conflicting unique constraint
-- The problem: expense_instances_payment_period_expense_type_unique prevents multiple drivers 
-- from having the same deduction type in the same period

-- Drop the problematic unique constraint that only considers period + expense_type
-- This was preventing proper per-driver deduction accumulation
ALTER TABLE expense_instances 
DROP CONSTRAINT IF EXISTS expense_instances_payment_period_expense_type_unique;

-- The correct unique constraint unique_expense_per_period_type_driver remains
-- which properly allows one deduction per (payment_period_id, expense_type_id, user_id)

-- Verify the remaining constraint is correct
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint c
    JOIN pg_index i ON c.conindid = i.indexrelid
    WHERE c.conname = 'unique_expense_per_period_type_driver'
  ) THEN
    -- Recreate the correct unique constraint if it doesn't exist
    CREATE UNIQUE INDEX unique_expense_per_period_type_driver 
    ON expense_instances (payment_period_id, expense_type_id, user_id);
  END IF;
END $$;