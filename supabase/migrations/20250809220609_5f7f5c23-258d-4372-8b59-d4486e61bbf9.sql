-- Remove unused indexes to improve database performance

-- Remove unused indexes from other_income table
DROP INDEX IF EXISTS public.idx_other_income_user_id;
DROP INDEX IF EXISTS public.idx_other_income_payment_period_id;

-- Remove unused indexes from user_invitations table
DROP INDEX IF EXISTS public.idx_user_invitations_accepted_by;

-- Remove unused indexes from system_backups table (low priority system functionality)
DROP INDEX IF EXISTS public.idx_system_backups_table_name;
DROP INDEX IF EXISTS public.idx_system_backups_backup_type;
DROP INDEX IF EXISTS public.idx_system_backups_created_at;
DROP INDEX IF EXISTS public.idx_system_backups_expires_at;

-- Remove unused indexes from deployment_log table (admin-only functionality)
DROP INDEX IF EXISTS public.idx_deployment_log_event_type;
DROP INDEX IF EXISTS public.idx_deployment_log_environment;
DROP INDEX IF EXISTS public.idx_deployment_log_created_at;
DROP INDEX IF EXISTS public.idx_deployment_log_status;

-- Remove unused indexes from system_health_log table
DROP INDEX IF EXISTS public.idx_system_health_log_timestamp;
DROP INDEX IF EXISTS public.idx_system_health_log_status;
DROP INDEX IF EXISTS public.idx_system_health_log_health_percentage;

-- Remove unused indexes from payment_methods table
DROP INDEX IF EXISTS public.idx_payment_methods_company_id;

-- Remove unused indexes from loads table
DROP INDEX IF EXISTS public.idx_loads_internal_dispatcher_id;
DROP INDEX IF EXISTS public.idx_loads_client_contact_id;

-- Remove unused indexes from fuel_expenses table
DROP INDEX IF EXISTS public.idx_fuel_expenses_driver_user_id;
DROP INDEX IF EXISTS public.idx_fuel_expenses_vehicle_id;

-- Remove unused indexes from expense_instances table
DROP INDEX IF EXISTS public.idx_expense_instances_expense_type_id;