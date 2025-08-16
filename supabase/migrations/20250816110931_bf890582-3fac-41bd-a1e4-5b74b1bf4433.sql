-- Fix unindexed foreign keys and remove unused indexes

-- Add missing indexes for foreign keys to improve performance
CREATE INDEX IF NOT EXISTS idx_companies_state_id 
ON companies (state_id);

CREATE INDEX IF NOT EXISTS idx_company_documents_archived_by 
ON company_documents (archived_by);

CREATE INDEX IF NOT EXISTS idx_deployment_log_initiated_by 
ON deployment_log (initiated_by);

CREATE INDEX IF NOT EXISTS idx_equipment_documents_archived_by 
ON equipment_documents (archived_by);

CREATE INDEX IF NOT EXISTS idx_fuel_expenses_driver_user_id 
ON fuel_expenses (driver_user_id);

CREATE INDEX IF NOT EXISTS idx_geotab_vehicle_assignments_driver_id 
ON geotab_vehicle_assignments (driver_id);

CREATE INDEX IF NOT EXISTS idx_geotab_vehicle_assignments_vehicle_id 
ON geotab_vehicle_assignments (vehicle_id);

CREATE INDEX IF NOT EXISTS idx_load_documents_archived_by 
ON load_documents (archived_by);

CREATE INDEX IF NOT EXISTS idx_loads_broker_dispatcher_id 
ON loads (broker_dispatcher_id);

CREATE INDEX IF NOT EXISTS idx_loads_internal_dispatcher_id 
ON loads (internal_dispatcher_id);

CREATE INDEX IF NOT EXISTS idx_payment_methods_created_by 
ON payment_methods (created_by);

CREATE INDEX IF NOT EXISTS idx_payment_reports_payment_method_id 
ON payment_reports (payment_method_id);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id 
ON security_audit_log (user_id);

CREATE INDEX IF NOT EXISTS idx_system_backups_created_by 
ON system_backups (created_by);

CREATE INDEX IF NOT EXISTS idx_user_company_roles_delegated_by 
ON user_company_roles (delegated_by);

-- Remove unused indexes that are not providing value
DROP INDEX IF EXISTS idx_user_company_roles_company_role_active;
DROP INDEX IF EXISTS idx_driver_profiles_user_active;
DROP INDEX IF EXISTS idx_driver_period_calculations_period;
DROP INDEX IF EXISTS idx_expense_instances_expense_type_id;
DROP INDEX IF EXISTS idx_payment_methods_company_id;
DROP INDEX IF EXISTS idx_driver_period_calculations_paid_by;
DROP INDEX IF EXISTS idx_driver_profiles_license_state;
DROP INDEX IF EXISTS idx_expense_template_history_template_id;
DROP INDEX IF EXISTS idx_user_invitations_accepted_by;
DROP INDEX IF EXISTS idx_fuel_expenses_vehicle_id;
DROP INDEX IF EXISTS idx_user_invitations_target_user_id;
DROP INDEX IF EXISTS idx_user_invitations_company_role;