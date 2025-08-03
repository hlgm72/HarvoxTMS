-- Remove more unused indexes - focusing on clearly unused functionality and audit fields
-- Being conservative and keeping important business logic indexes even if not used yet

-- Drop audit/archival indexes that are not used in queries
DROP INDEX IF EXISTS idx_company_documents_archived_by;
DROP INDEX IF EXISTS idx_equipment_documents_archived_by; 
DROP INDEX IF EXISTS idx_load_documents_archived_by;

-- Drop indexes on fields that are for tracking who paid (audit only)
DROP INDEX IF EXISTS idx_driver_period_calculations_paid_by;

-- Drop security audit log index (this table is for logging only)
DROP INDEX IF EXISTS idx_security_audit_log_user_id;

-- Drop dispatcher functionality indexes (limited feature usage)
DROP INDEX IF EXISTS idx_loads_internal_dispatcher_id;
DROP INDEX IF EXISTS idx_loads_broker_dispatcher_id;

-- Drop template history index (rarely queried directly)
DROP INDEX IF EXISTS idx_expense_template_history_template_id;

-- Drop vehicle-related index (equipment integration limited)
DROP INDEX IF EXISTS idx_fuel_expenses_vehicle_id;

-- Drop payment method indexes (limited functionality)
DROP INDEX IF EXISTS idx_payment_methods_company_id;
DROP INDEX IF EXISTS idx_payment_methods_created_by;
DROP INDEX IF EXISTS idx_payment_reports_payment_method_id;

-- Drop delegated_by index (delegation feature not implemented)
DROP INDEX IF EXISTS idx_user_company_roles_delegated_by;

-- Drop card last four index (not used for searching)
DROP INDEX IF EXISTS idx_fuel_expenses_card_last_four;

-- Drop driver profile license state index (not used for filtering)
DROP INDEX IF EXISTS idx_driver_profiles_license_state;