-- Address remaining database performance issues
-- Remove unused indexes (including recently created ones that aren't being used)
-- Add indexes only for foreign keys that are actively needed

-- Remove unused indexes that aren't providing value
DROP INDEX IF EXISTS idx_vehicle_assignments_driver_id;
DROP INDEX IF EXISTS idx_vehicle_assignments_vehicle_id;
DROP INDEX IF EXISTS idx_driver_profiles_license_state;
DROP INDEX IF EXISTS idx_companies_state_id;
DROP INDEX IF EXISTS idx_company_broker_dispatchers_broker_id;
DROP INDEX IF EXISTS idx_expense_instances_payment_period_id;
DROP INDEX IF EXISTS idx_fuel_expenses_payment_period_id;
DROP INDEX IF EXISTS idx_fuel_expenses_vehicle_id;
DROP INDEX IF EXISTS idx_other_income_payment_period_id;
DROP INDEX IF EXISTS idx_load_stops_load_id;
DROP INDEX IF EXISTS idx_load_documents_load_id;

-- Add indexes for foreign keys that are actually needed for performance
CREATE INDEX IF NOT EXISTS idx_companies_city_id ON public.companies(city_id);
CREATE INDEX IF NOT EXISTS idx_expense_instances_expense_type_id ON public.expense_instances(expense_type_id);
CREATE INDEX IF NOT EXISTS idx_expense_instances_recurring_template_id ON public.expense_instances(recurring_template_id);
CREATE INDEX IF NOT EXISTS idx_expense_template_history_template_id ON public.expense_template_history(template_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON public.payment_methods(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_created_by ON public.payment_methods(created_by);
CREATE INDEX IF NOT EXISTS idx_payment_reports_payment_method_id ON public.payment_reports(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_reports_payment_period_id ON public.payment_reports(payment_period_id);
CREATE INDEX IF NOT EXISTS idx_payment_reports_reported_by ON public.payment_reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_payment_reports_verified_by ON public.payment_reports(verified_by);
CREATE INDEX IF NOT EXISTS idx_pending_expenses_applied_to_period_id ON public.pending_expenses(applied_to_period_id);
CREATE INDEX IF NOT EXISTS idx_pending_expenses_expense_instance_id ON public.pending_expenses(expense_instance_id);
CREATE INDEX IF NOT EXISTS idx_pending_expenses_original_period_id ON public.pending_expenses(original_period_id);
CREATE INDEX IF NOT EXISTS idx_recurring_expense_templates_expense_type_id ON public.recurring_expense_templates(expense_type_id);
CREATE INDEX IF NOT EXISTS idx_user_company_roles_delegated_by ON public.user_company_roles(delegated_by);
CREATE INDEX IF NOT EXISTS idx_user_invitations_company_id ON public.user_invitations(company_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_invited_by ON public.user_invitations(invited_by);

-- Log the cleanup
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('foreign_key_indexes_strategic_optimization', jsonb_build_object(
  'timestamp', now(),
  'unused_indexes_removed', 11,
  'strategic_foreign_key_indexes_added', 17,
  'description', 'Strategic optimization: removed unused indexes and added only essential foreign key indexes'
));