-- Database optimization: Add missing foreign key indexes and remove unused indexes

-- 1. Add missing indexes for foreign keys in user_invitations table
CREATE INDEX IF NOT EXISTS idx_user_invitations_accepted_by ON public.user_invitations(accepted_by);
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON public.user_invitations(invited_by);

-- 2. Remove unused indexes that are clearly not needed for current functionality
-- These are indexes that are not being used and unlikely to be needed soon

-- Remove unused indexes from user_invitations (keep essential ones)
DROP INDEX IF EXISTS idx_user_invitations_email;
DROP INDEX IF EXISTS idx_user_invitations_expires_at;

-- Remove unused indexes from other_income (recently created, not yet in use)
DROP INDEX IF EXISTS idx_other_income_income_date;
DROP INDEX IF EXISTS idx_other_income_status;

-- Remove unused administrative/audit indexes that are rarely queried
DROP INDEX IF EXISTS idx_company_documents_archived_by;
DROP INDEX IF EXISTS idx_equipment_documents_archived_by;
DROP INDEX IF EXISTS idx_load_documents_archived_by;
DROP INDEX IF EXISTS idx_user_company_roles_delegated_by;
DROP INDEX IF EXISTS idx_security_audit_log_user_id;

-- Remove unused geographic indexes (companies location data not heavily queried)
DROP INDEX IF EXISTS idx_companies_city_id;
DROP INDEX IF EXISTS idx_companies_state_id;

-- Remove unused payment method indexes (not frequently queried)
DROP INDEX IF EXISTS idx_payment_methods_created_by;
DROP INDEX IF EXISTS idx_payment_reports_payment_method_id;

-- Remove unused Geotab integration indexes (if Geotab not heavily used)
DROP INDEX IF EXISTS idx_geotab_vehicle_assignments_driver_id;
DROP INDEX IF EXISTS idx_geotab_vehicle_assignments_vehicle_id;

-- Remove unused driver profile indexes (license state not frequently filtered)
DROP INDEX IF EXISTS idx_driver_profiles_license_state;

-- Remove unused payment calculation indexes (paid_by not frequently queried)
DROP INDEX IF EXISTS idx_driver_period_calculations_paid_by;

-- Remove unused expense template history index (not frequently accessed)
DROP INDEX IF EXISTS idx_expense_template_history_template_id;

-- Keep essential indexes that might be used soon:
-- - idx_user_invitations_token (needed for invitation validation)
-- - idx_other_income_user_id and idx_other_income_payment_period_id (needed for RLS policies)
-- - idx_loads_payment_period_id (needed for payment calculations)
-- - idx_fuel_expenses_driver_user_id (needed for driver fuel queries)
-- - idx_payment_methods_company_id (needed for company payment method queries)
-- - idx_loads_internal_dispatcher_id (might be used for dispatcher queries)
-- - idx_loads_client_contact_id (might be used for client contact queries)
-- - idx_fuel_expenses_vehicle_id (might be used for vehicle fuel queries)
-- - idx_expense_instances_expense_type_id (needed for expense type queries)