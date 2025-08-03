-- Final cleanup: Address remaining unindexed foreign keys strategically
-- Only create indexes for foreign keys that are actually used in business queries
-- Keep important business logic indexes even if showing as "unused"

-- Remove indexes we created that are truly not being used
DROP INDEX IF EXISTS idx_payment_methods_company_id;
DROP INDEX IF EXISTS idx_security_audit_log_user_id;

-- Create indexes ONLY for foreign keys used in actual business queries
-- Expense instances by expense type (used when filtering expenses by type)
CREATE INDEX IF NOT EXISTS idx_expense_instances_expense_type_id ON public.expense_instances(expense_type_id);

-- Payment reports by payment method (used when filtering reports by payment method)
CREATE INDEX IF NOT EXISTS idx_payment_reports_payment_method_id ON public.payment_reports(payment_method_id);

-- Note: We are intentionally NOT creating indexes for:
-- - archived_by fields (audit only, not queried for business logic)
-- - city_id/state_id in companies (geographic features not implemented)
-- - license_state in driver_profiles (not used for filtering)
-- - vehicle_id in fuel_expenses (vehicle tracking limited)
-- - geotab_vehicle_assignments (Geotab integration not implemented)
-- - created_by in payment_methods (audit field only)
-- - delegated_by in user_company_roles (delegation feature not implemented)
-- - dispatcher fields in loads (dispatcher features limited)
-- - expense_template_history (history table, rarely queried directly)

-- Important business indexes are kept even if showing as "unused":
-- - idx_loads_driver_user_id (essential for driver load queries)
-- - idx_loads_payment_period_id (essential for payment period load queries)  
-- - idx_fuel_expenses_driver_user_id (essential for driver fuel expense queries)
-- - idx_company_payment_periods_company_dates (essential for payment period lookups)