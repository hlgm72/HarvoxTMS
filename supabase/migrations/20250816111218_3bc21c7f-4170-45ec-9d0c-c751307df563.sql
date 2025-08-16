-- Fix remaining unindexed foreign keys and remove unused indexes

-- Add missing indexes for foreign keys
CREATE INDEX IF NOT EXISTS idx_driver_period_calculations_paid_by 
ON driver_period_calculations (paid_by);

CREATE INDEX IF NOT EXISTS idx_driver_profiles_license_state 
ON driver_profiles (license_state);

CREATE INDEX IF NOT EXISTS idx_expense_instances_expense_type_id 
ON expense_instances (expense_type_id);

CREATE INDEX IF NOT EXISTS idx_expense_template_history_template_id 
ON expense_template_history (template_id);

CREATE INDEX IF NOT EXISTS idx_fuel_expenses_vehicle_id 
ON fuel_expenses (vehicle_id);

CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id 
ON payment_methods (company_id);

CREATE INDEX IF NOT EXISTS idx_user_invitations_accepted_by 
ON user_invitations (accepted_by);

CREATE INDEX IF NOT EXISTS idx_user_invitations_target_user_id 
ON user_invitations (target_user_id);

-- Remove unused indexes to optimize storage and maintenance
DROP INDEX IF EXISTS idx_companies_state_id;
DROP INDEX IF EXISTS idx_company_documents_archived_by;
DROP INDEX IF EXISTS idx_deployment_log_initiated_by;
DROP INDEX IF EXISTS idx_equipment_documents_archived_by;
DROP INDEX IF EXISTS idx_fuel_expenses_driver_user_id;
DROP INDEX IF EXISTS idx_geotab_vehicle_assignments_driver_id;
DROP INDEX IF EXISTS idx_geotab_vehicle_assignments_vehicle_id;
DROP INDEX IF EXISTS idx_load_documents_archived_by;
DROP INDEX IF EXISTS idx_loads_client_contact_id;
DROP INDEX IF EXISTS idx_loads_internal_dispatcher_id;
DROP INDEX IF EXISTS idx_payment_methods_created_by;
DROP INDEX IF EXISTS idx_payment_reports_payment_method_id;
DROP INDEX IF EXISTS idx_security_audit_log_user_id;
DROP INDEX IF EXISTS idx_system_backups_created_by;
DROP INDEX IF EXISTS idx_user_company_roles_delegated_by;