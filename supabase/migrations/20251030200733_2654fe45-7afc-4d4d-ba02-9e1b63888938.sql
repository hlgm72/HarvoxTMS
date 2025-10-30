-- Fix: Remove auto_cleanup_empty_periods trigger from loads table
-- This trigger conflicts with delete_load_with_validation which handles all cleanup manually
-- The trigger tries to delete expense_instances and periods during the deletion process
-- causing foreign key violations because delete_load_with_validation is also deleting them

DROP TRIGGER IF EXISTS trigger_auto_cleanup_empty_periods ON loads;

-- Keep the trigger on OTHER tables if needed, but NOT on loads
-- since delete_load_with_validation has full control of the cleanup process