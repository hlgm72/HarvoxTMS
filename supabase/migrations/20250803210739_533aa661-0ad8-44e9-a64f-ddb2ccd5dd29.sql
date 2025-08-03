-- Final database optimization: Accept remaining warnings as acceptable for production
-- These are INFO level warnings, not critical errors
-- Strategy: Remove truly unused indexes and be selective about foreign key indexes

-- Remove indexes that are confirmed unused and unlikely to be used in near future
DROP INDEX IF EXISTS idx_expense_instances_expense_type_id;
DROP INDEX IF EXISTS idx_payment_reports_payment_method_id;

-- Keep essential business logic indexes even if showing as "unused" in development
-- These will be used when the application scales:
-- - idx_loads_driver_user_id (loads by driver queries)
-- - idx_loads_payment_period_id (loads by payment period queries)  
-- - idx_fuel_expenses_driver_user_id (fuel expenses by driver queries)
-- - idx_company_payment_periods_company_dates (payment period lookups)

-- Add only the most critical foreign key indexes that will definitely be used
-- Payment methods by company (used in payment method selection)
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON public.payment_methods(company_id);

-- Note: We are accepting the following unindexed foreign keys as INFO warnings:
-- This is normal for a production system where not all foreign keys need indexes
-- 
-- NOT creating indexes for:
-- - companies.city_id/state_id (geographic features not implemented)
-- - *.archived_by (audit fields, not queried frequently)
-- - driver_profiles.license_state (not used for filtering)
-- - fuel_expenses.vehicle_id (vehicle tracking limited)
-- - geotab_vehicle_assignments.* (Geotab integration not implemented)
-- - load_documents.archived_by (audit field)
-- - loads.broker_dispatcher_id/internal_dispatcher_id (dispatcher features limited)
-- - payment_methods.created_by (audit field)
-- - security_audit_log.user_id (audit table, queried infrequently)
-- - user_company_roles.delegated_by (delegation feature not implemented)
-- - expense_template_history.template_id (history table, rarely queried)
-- - equipment_documents.archived_by (audit field)
-- - driver_period_calculations.paid_by (audit field)

-- These remaining 18 unindexed foreign keys are acceptable INFO warnings
-- They don't impact core business functionality and creating indexes
-- for rarely-used fields would waste storage and slow down writes