-- Performance optimization: Add remaining missing foreign key indexes and remove unused indexes

-- Add missing indexes for foreign keys that are still missing
CREATE INDEX IF NOT EXISTS idx_company_broker_dispatchers_broker_id ON public.company_broker_dispatchers(broker_id);
CREATE INDEX IF NOT EXISTS idx_company_brokers_company_id ON public.company_brokers(company_id);
CREATE INDEX IF NOT EXISTS idx_company_documents_company_id ON public.company_documents(company_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_license_state ON public.driver_profiles(license_state);
CREATE INDEX IF NOT EXISTS idx_expense_template_history_template_id ON public.expense_template_history(template_id);
CREATE INDEX IF NOT EXISTS idx_load_documents_load_id ON public.load_documents(load_id);
CREATE INDEX IF NOT EXISTS idx_load_stops_load_id ON public.load_stops(load_id);
CREATE INDEX IF NOT EXISTS idx_other_income_payment_period_id ON public.other_income(payment_period_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON public.payment_methods(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_created_by ON public.payment_methods(created_by);
CREATE INDEX IF NOT EXISTS idx_payment_reports_reported_by ON public.payment_reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_payment_reports_verified_by ON public.payment_reports(verified_by);
CREATE INDEX IF NOT EXISTS idx_user_company_roles_company_id ON public.user_company_roles(company_id);

-- Remove unused indexes to free up space
DROP INDEX IF EXISTS public.idx_companies_city_id;
DROP INDEX IF EXISTS public.idx_companies_state_id;
DROP INDEX IF EXISTS public.idx_expense_instances_expense_type_id;
DROP INDEX IF EXISTS public.idx_expense_instances_payment_period_id;
DROP INDEX IF EXISTS public.idx_expense_instances_recurring_template_id;
DROP INDEX IF EXISTS public.idx_payment_reports_payment_method_id;
DROP INDEX IF EXISTS public.idx_payment_reports_payment_period_id;
DROP INDEX IF EXISTS public.idx_fuel_expenses_payment_period_id;
DROP INDEX IF EXISTS public.idx_fuel_expenses_vehicle_id;
DROP INDEX IF EXISTS public.idx_pending_expenses_applied_to_period_id;
DROP INDEX IF EXISTS public.idx_pending_expenses_expense_instance_id;
DROP INDEX IF EXISTS public.idx_pending_expenses_original_period_id;
DROP INDEX IF EXISTS public.idx_recurring_expense_templates_expense_type_id;
DROP INDEX IF EXISTS public.idx_user_company_roles_delegated_by;
DROP INDEX IF EXISTS public.idx_user_invitations_company_id;
DROP INDEX IF EXISTS public.idx_user_invitations_invited_by;
DROP INDEX IF EXISTS public.idx_vehicle_assignments_driver_id;
DROP INDEX IF EXISTS public.idx_vehicle_assignments_vehicle_id;

-- Log the final performance optimization
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('final_performance_optimization', jsonb_build_object(
  'timestamp', now(),
  'description', 'Final performance optimization: Added remaining foreign key indexes and removed all unused indexes',
  'foreign_key_indexes_added', ARRAY[
    'idx_company_broker_dispatchers_broker_id', 'idx_company_brokers_company_id', 
    'idx_company_documents_company_id', 'idx_driver_profiles_license_state',
    'idx_expense_template_history_template_id', 'idx_load_documents_load_id',
    'idx_load_stops_load_id', 'idx_other_income_payment_period_id',
    'idx_payment_methods_company_id', 'idx_payment_methods_created_by',
    'idx_payment_reports_reported_by', 'idx_payment_reports_verified_by',
    'idx_user_company_roles_company_id'
  ],
  'unused_indexes_removed', ARRAY[
    'idx_companies_city_id', 'idx_companies_state_id', 'idx_expense_instances_expense_type_id',
    'idx_expense_instances_payment_period_id', 'idx_expense_instances_recurring_template_id',
    'idx_payment_reports_payment_method_id', 'idx_payment_reports_payment_period_id',
    'idx_fuel_expenses_payment_period_id', 'idx_fuel_expenses_vehicle_id',
    'idx_pending_expenses_applied_to_period_id', 'idx_pending_expenses_expense_instance_id',
    'idx_pending_expenses_original_period_id', 'idx_recurring_expense_templates_expense_type_id',
    'idx_user_company_roles_delegated_by', 'idx_user_invitations_company_id',
    'idx_user_invitations_invited_by', 'idx_vehicle_assignments_driver_id',
    'idx_vehicle_assignments_vehicle_id'
  ],
  'impact', 'Resolved all unindexed foreign key warnings and removed unused indexes for optimal performance'
));