-- Fix: Drop problematic triggers that conflict with load deletion
-- These triggers try to recreate expense_instances after deletion

-- Remove conflicting triggers
DROP TRIGGER IF EXISTS trigger_cleanup_empty_period_after_deduction_delete ON expense_instances;
DROP TRIGGER IF EXISTS trigger_cleanup_payroll_after_expense_delete ON expense_instances;
DROP TRIGGER IF EXISTS expense_instances_auto_recalculate_trigger ON expense_instances;
DROP TRIGGER IF EXISTS trigger_auto_recalculate_on_expense_changes ON expense_instances;

-- Keep only essential triggers
-- (update timestamp trigger is safe, immutability check is safe)