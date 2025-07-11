-- Performance optimization: Add missing foreign key indexes and remove unused indexes

-- Add missing indexes for foreign keys (Critical Performance Issues)
CREATE INDEX IF NOT EXISTS idx_companies_city_id ON public.companies(city_id);
CREATE INDEX IF NOT EXISTS idx_companies_state_id ON public.companies(state_id);
CREATE INDEX IF NOT EXISTS idx_expense_instances_expense_type_id ON public.expense_instances(expense_type_id);
CREATE INDEX IF NOT EXISTS idx_expense_instances_payment_period_id ON public.expense_instances(payment_period_id);
CREATE INDEX IF NOT EXISTS idx_expense_instances_recurring_template_id ON public.expense_instances(recurring_template_id);
CREATE INDEX IF NOT EXISTS idx_payment_reports_payment_method_id ON public.payment_reports(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_reports_payment_period_id ON public.payment_reports(payment_period_id);
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_payment_period_id ON public.fuel_expenses(payment_period_id);
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_vehicle_id ON public.fuel_expenses(vehicle_id);

-- Remove unused indexes to free up space
DROP INDEX IF EXISTS public.idx_user_company_roles_user_id;
DROP INDEX IF EXISTS public.idx_user_company_roles_company_id;
DROP INDEX IF EXISTS public.idx_driver_profiles_user_id;
DROP INDEX IF EXISTS public.idx_company_drivers_user_id;
DROP INDEX IF EXISTS public.idx_owner_operators_user_id;
DROP INDEX IF EXISTS public.idx_payment_periods_driver_user_id;
DROP INDEX IF EXISTS public.idx_fuel_expenses_driver_user_id;
DROP INDEX IF EXISTS public.idx_loads_driver_user_id;

-- Log the performance optimization
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('performance_optimization', jsonb_build_object(
  'timestamp', now(),
  'description', 'Performance optimization: Added missing foreign key indexes and removed unused indexes',
  'indexes_added', ARRAY[
    'idx_companies_city_id', 'idx_companies_state_id', 'idx_expense_instances_expense_type_id',
    'idx_expense_instances_payment_period_id', 'idx_expense_instances_recurring_template_id',
    'idx_payment_reports_payment_method_id', 'idx_payment_reports_payment_period_id',
    'idx_fuel_expenses_payment_period_id', 'idx_fuel_expenses_vehicle_id'
  ],
  'indexes_removed', ARRAY[
    'idx_user_company_roles_user_id', 'idx_user_company_roles_company_id', 'idx_driver_profiles_user_id',
    'idx_company_drivers_user_id', 'idx_owner_operators_user_id', 'idx_payment_periods_driver_user_id',
    'idx_fuel_expenses_driver_user_id', 'idx_loads_driver_user_id'
  ],
  'impact', 'Resolved critical foreign key performance issues and freed up storage space'
));