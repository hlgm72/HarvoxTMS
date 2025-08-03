-- Final database optimization: Handle unindexed foreign keys and remove truly unused indexes
-- Strategy: Only create indexes for foreign keys that are actually used in queries
-- Remove indexes that are confirmed unused and unlikely to be used

-- Remove remaining unused indexes (being very selective to keep important business logic indexes)
DROP INDEX IF EXISTS idx_expense_instances_driver_user_id;
DROP INDEX IF EXISTS idx_expense_instances_expense_type_id;
DROP INDEX IF EXISTS idx_company_payment_periods_locked;
DROP INDEX IF EXISTS idx_driver_period_calculations_status;
DROP INDEX IF EXISTS idx_company_clients_active;
DROP INDEX IF EXISTS idx_loads_status;
DROP INDEX IF EXISTS idx_dispatcher_other_income_dispatcher_user_id;
DROP INDEX IF EXISTS idx_dispatcher_other_income_status;
DROP INDEX IF EXISTS idx_user_company_roles_active;
DROP INDEX IF EXISTS idx_fuel_expenses_transaction_date;
DROP INDEX IF EXISTS idx_equipment_assignments_driver_user_id;
DROP INDEX IF EXISTS idx_loads_driver_period;
DROP INDEX IF EXISTS idx_fuel_expenses_driver_period;

-- Create indexes ONLY for foreign keys that are actually used in business queries
-- These are the ones that improve real query performance

-- Payment methods by company (used when selecting payment methods for a company)
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON public.payment_methods(company_id);

-- Security audit logs by user (used when viewing user activity)  
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id ON public.security_audit_log(user_id);

-- Company payment periods by company and dates (used in payment period queries)
-- Note: These might show as "unused" but they are critical for payment period lookups
CREATE INDEX IF NOT EXISTS idx_company_payment_periods_company_dates ON public.company_payment_periods(company_id, period_start_date, period_end_date);

-- Note: We are NOT creating indexes for:
-- - archived_by fields (audit only, not queried frequently)
-- - geotab related tables (feature not implemented)
-- - license_state (not used for filtering)
-- - vehicle_id in fuel_expenses (vehicle feature limited)
-- - dispatcher fields in loads (limited functionality)
-- - expense_template_history (rarely queried)
-- - city_id/state_id in companies (geographic queries not implemented)