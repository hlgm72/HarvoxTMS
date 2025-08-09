-- Clean up unused indexes first
DROP INDEX IF EXISTS public.idx_companies_city_id_critical;
DROP INDEX IF EXISTS public.idx_companies_state_id_critical;
DROP INDEX IF EXISTS public.idx_payment_reports_payment_method_id_critical;
DROP INDEX IF EXISTS public.idx_security_audit_log_user_id_critical;
DROP INDEX IF EXISTS public.idx_fuel_expenses_driver_critical;
DROP INDEX IF EXISTS public.idx_loads_internal_dispatcher_critical;

-- Add indexes only for the most critical foreign keys that are frequently used

-- Core business operations - high priority
CREATE INDEX IF NOT EXISTS idx_expense_instances_expense_type_id ON public.expense_instances(expense_type_id);
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_vehicle_id ON public.fuel_expenses(vehicle_id) WHERE vehicle_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON public.payment_methods(company_id);

-- Payment and auditing - medium priority  
CREATE INDEX IF NOT EXISTS idx_driver_period_calculations_paid_by ON public.driver_period_calculations(paid_by) WHERE paid_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_driver_profiles_license_state ON public.driver_profiles(license_state) WHERE license_state IS NOT NULL;

-- Template history (used for auditing expense changes)
CREATE INDEX IF NOT EXISTS idx_expense_template_history_template_id ON public.expense_template_history(template_id);

-- User management auditing
CREATE INDEX IF NOT EXISTS idx_user_invitations_accepted_by ON public.user_invitations(accepted_by) WHERE accepted_by IS NOT NULL;