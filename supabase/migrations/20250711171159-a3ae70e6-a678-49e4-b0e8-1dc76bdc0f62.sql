-- Add missing indexes for foreign keys and remove unused indexes
-- This will improve query performance for foreign key lookups

-- Add indexes for unindexed foreign keys
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

-- Remove unused indexes on vehicle_assignments table
DROP INDEX IF EXISTS idx_vehicle_assignments_vehicle_id;
DROP INDEX IF EXISTS idx_vehicle_assignments_driver_id;
DROP INDEX IF EXISTS idx_vehicle_assignments_active;

-- Log the optimization
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('foreign_key_indexes_optimization', jsonb_build_object(
  'timestamp', now(),
  'indexes_added', 17,
  'indexes_removed', 3,
  'description', 'Added missing foreign key indexes and removed unused indexes to optimize performance'
));