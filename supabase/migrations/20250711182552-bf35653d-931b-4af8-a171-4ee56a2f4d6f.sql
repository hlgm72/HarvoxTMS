-- Remove all unused indexes to optimize database performance and free up space

-- Remove unused indexes from payment_reports
DROP INDEX IF EXISTS public.idx_payment_reports_payment_method_id;
DROP INDEX IF EXISTS public.idx_payment_reports_payment_period_id;
DROP INDEX IF EXISTS public.idx_payment_reports_reported_by;
DROP INDEX IF EXISTS public.idx_payment_reports_verified_by;

-- Remove unused indexes from companies
DROP INDEX IF EXISTS public.idx_companies_city_id;
DROP INDEX IF EXISTS public.idx_companies_state_id;

-- Remove unused indexes from expense_instances
DROP INDEX IF EXISTS public.idx_expense_instances_expense_type_id;
DROP INDEX IF EXISTS public.idx_expense_instances_payment_period_id;
DROP INDEX IF EXISTS public.idx_expense_instances_recurring_template_id;

-- Remove unused indexes from fuel_expenses
DROP INDEX IF EXISTS public.idx_fuel_expenses_payment_period_id;
DROP INDEX IF EXISTS public.idx_fuel_expenses_vehicle_id;

-- Remove unused indexes from pending_expenses
DROP INDEX IF EXISTS public.idx_pending_expenses_applied_to_period_id;
DROP INDEX IF EXISTS public.idx_pending_expenses_expense_instance_id;
DROP INDEX IF EXISTS public.idx_pending_expenses_original_period_id;

-- Remove unused indexes from other tables
DROP INDEX IF EXISTS public.idx_recurring_expense_templates_expense_type_id;
DROP INDEX IF EXISTS public.idx_state_cities_state_id;
DROP INDEX IF EXISTS public.idx_vehicle_assignments_driver_id;
DROP INDEX IF EXISTS public.idx_vehicle_assignments_vehicle_id;
DROP INDEX IF EXISTS public.idx_user_invitations_company_id;
DROP INDEX IF EXISTS public.idx_user_invitations_invited_by;
DROP INDEX IF EXISTS public.idx_user_company_roles_company_id;
DROP INDEX IF EXISTS public.idx_user_company_roles_user_id;
DROP INDEX IF EXISTS public.idx_user_company_roles_delegated_by;

-- Log the unused index cleanup
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('unused_index_cleanup', jsonb_build_object(
  'timestamp', now(),
  'description', 'Comprehensive cleanup of all unused indexes to optimize database performance',
  'unused_indexes_removed', ARRAY[
    'idx_payment_reports_payment_method_id', 'idx_payment_reports_payment_period_id', 'idx_payment_reports_reported_by', 'idx_payment_reports_verified_by',
    'idx_companies_city_id', 'idx_companies_state_id',
    'idx_expense_instances_expense_type_id', 'idx_expense_instances_payment_period_id', 'idx_expense_instances_recurring_template_id',
    'idx_fuel_expenses_payment_period_id', 'idx_fuel_expenses_vehicle_id',
    'idx_pending_expenses_applied_to_period_id', 'idx_pending_expenses_expense_instance_id', 'idx_pending_expenses_original_period_id',
    'idx_recurring_expense_templates_expense_type_id', 'idx_state_cities_state_id',
    'idx_vehicle_assignments_driver_id', 'idx_vehicle_assignments_vehicle_id',
    'idx_user_invitations_company_id', 'idx_user_invitations_invited_by',
    'idx_user_company_roles_company_id', 'idx_user_company_roles_user_id', 'idx_user_company_roles_delegated_by'
  ],
  'total_indexes_removed', 22,
  'impact', 'Freed up significant storage space and eliminated maintenance overhead from unused indexes'
));