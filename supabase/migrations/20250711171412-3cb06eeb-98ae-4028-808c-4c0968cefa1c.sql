-- Add missing foreign key indexes and remove unused ones
-- This will optimize database performance by having proper indexes for foreign keys
-- while removing unused indexes that consume unnecessary resources

-- First, remove unused indexes that were created previously but are not being used
DROP INDEX IF EXISTS idx_user_company_roles_delegated_by;
DROP INDEX IF EXISTS idx_companies_city_id;
DROP INDEX IF EXISTS idx_recurring_expense_templates_expense_type_id;
DROP INDEX IF EXISTS idx_expense_instances_expense_type_id;
DROP INDEX IF EXISTS idx_expense_instances_recurring_template_id;
DROP INDEX IF EXISTS idx_pending_expenses_applied_to_period_id;
DROP INDEX IF EXISTS idx_pending_expenses_expense_instance_id;
DROP INDEX IF EXISTS idx_pending_expenses_original_period_id;
DROP INDEX IF EXISTS idx_expense_template_history_template_id;
DROP INDEX IF EXISTS idx_payment_methods_company_id;
DROP INDEX IF EXISTS idx_payment_methods_created_by;
DROP INDEX IF EXISTS idx_payment_reports_payment_method_id;
DROP INDEX IF EXISTS idx_payment_reports_payment_period_id;
DROP INDEX IF EXISTS idx_payment_reports_reported_by;
DROP INDEX IF EXISTS idx_payment_reports_verified_by;
DROP INDEX IF EXISTS idx_user_invitations_company_id;
DROP INDEX IF EXISTS idx_user_invitations_invited_by;

-- Now add indexes for unindexed foreign keys that are actually needed
CREATE INDEX IF NOT EXISTS idx_companies_state_id ON public.companies(state_id);
CREATE INDEX IF NOT EXISTS idx_company_broker_dispatchers_broker_id ON public.company_broker_dispatchers(broker_id);
CREATE INDEX IF NOT EXISTS idx_driver_profiles_license_state ON public.driver_profiles(license_state);
CREATE INDEX IF NOT EXISTS idx_expense_instances_payment_period_id ON public.expense_instances(payment_period_id);
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_payment_period_id ON public.fuel_expenses(payment_period_id);
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_vehicle_id ON public.fuel_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_load_documents_load_id ON public.load_documents(load_id);
CREATE INDEX IF NOT EXISTS idx_load_stops_load_id ON public.load_stops(load_id);
CREATE INDEX IF NOT EXISTS idx_other_income_payment_period_id ON public.other_income(payment_period_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_driver_id ON public.vehicle_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_vehicle_id ON public.vehicle_assignments(vehicle_id);

-- Log the optimization
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('foreign_key_indexes_final_optimization', jsonb_build_object(
  'timestamp', now(),
  'unused_indexes_removed', 17,
  'foreign_key_indexes_added', 11,
  'description', 'Final optimization: removed unused indexes and added essential foreign key indexes'
));