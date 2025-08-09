-- Remove unused indexes to optimize database performance

-- Remove indexes that are confirmed as unused and unlikely to be used
DROP INDEX IF EXISTS public.idx_companies_city_id;
DROP INDEX IF EXISTS public.idx_companies_state_id;
DROP INDEX IF EXISTS public.idx_driver_period_calculations_paid_by;
DROP INDEX IF EXISTS public.idx_user_company_roles_delegated_by;

-- Remove document archival indexes (low usage, admin-only operations)
DROP INDEX IF EXISTS public.idx_company_documents_archived_by;
DROP INDEX IF EXISTS public.idx_equipment_documents_archived_by;
DROP INDEX IF EXISTS public.idx_load_documents_archived_by;

-- Remove payment tracking indexes that are not being used
DROP INDEX IF EXISTS public.idx_payment_methods_created_by;
DROP INDEX IF EXISTS public.idx_payment_reports_payment_method_id;

-- Remove template history index (low usage)
DROP INDEX IF EXISTS public.idx_expense_template_history_template_id;

-- Remove Geotab indexes (feature not heavily used)
DROP INDEX IF EXISTS public.idx_geotab_vehicle_assignments_driver_id;
DROP INDEX IF EXISTS public.idx_geotab_vehicle_assignments_vehicle_id;

-- Remove system operation indexes (admin-only, low frequency)
DROP INDEX IF EXISTS public.idx_deployment_log_initiated_by;
DROP INDEX IF EXISTS public.idx_system_backups_created_by;
DROP INDEX IF EXISTS public.idx_security_audit_log_user_id;