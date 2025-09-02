-- Fix deductions accumulation issue by removing conflicting unique constraint
-- The problem: expense_instances_payment_period_expense_type_unique prevents multiple drivers 
-- from having the same deduction type in the same period

-- Drop the problematic unique index that only considers period + expense_type
-- This was preventing proper per-driver deduction accumulation
DROP INDEX IF EXISTS expense_instances_payment_period_expense_type_unique;

-- The correct unique constraint unique_expense_per_period_type_driver remains
-- which properly allows one deduction per (payment_period_id, expense_type_id, user_id)

-- Log the fix
COMMENT ON INDEX unique_expense_per_period_type_driver IS 'Correct unique constraint: allows one deduction per driver per type per period';