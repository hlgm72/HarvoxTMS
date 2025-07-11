-- Performance optimization: Add remaining missing foreign key indexes

-- Check and add all missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_companies_city_id ON public.companies(city_id);
CREATE INDEX IF NOT EXISTS idx_companies_state_id ON public.companies(state_id);

-- Expense instances foreign keys
CREATE INDEX IF NOT EXISTS idx_expense_instances_expense_type_id ON public.expense_instances(expense_type_id);
CREATE INDEX IF NOT EXISTS idx_expense_instances_payment_period_id ON public.expense_instances(payment_period_id);
CREATE INDEX IF NOT EXISTS idx_expense_instances_recurring_template_id ON public.expense_instances(recurring_template_id);

-- Fuel expenses foreign keys
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_payment_period_id ON public.fuel_expenses(payment_period_id);
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_vehicle_id ON public.fuel_expenses(vehicle_id);

-- Payment reports foreign keys
CREATE INDEX IF NOT EXISTS idx_payment_reports_payment_method_id ON public.payment_reports(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_reports_payment_period_id ON public.payment_reports(payment_period_id);

-- Pending expenses foreign keys
CREATE INDEX IF NOT EXISTS idx_pending_expenses_applied_to_period_id ON public.pending_expenses(applied_to_period_id);
CREATE INDEX IF NOT EXISTS idx_pending_expenses_expense_instance_id ON public.pending_expenses(expense_instance_id);
CREATE INDEX IF NOT EXISTS idx_pending_expenses_original_period_id ON public.pending_expenses(original_period_id);

-- Additional foreign keys that might be missing
CREATE INDEX IF NOT EXISTS idx_recurring_expense_templates_expense_type_id ON public.recurring_expense_templates(expense_type_id);
CREATE INDEX IF NOT EXISTS idx_state_cities_state_id ON public.state_cities(state_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_driver_id ON public.vehicle_assignments(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_assignments_vehicle_id ON public.vehicle_assignments(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_positions_vehicle_id ON public.vehicle_positions(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_company_id ON public.user_invitations(company_id);

-- Log the comprehensive foreign key index creation
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('comprehensive_fkey_indexing', jsonb_build_object(
  'timestamp', now(),
  'description', 'Comprehensive foreign key indexing to resolve all unindexed foreign key warnings',
  'all_foreign_key_indexes_added', ARRAY[
    'idx_companies_city_id', 'idx_companies_state_id',
    'idx_expense_instances_expense_type_id', 'idx_expense_instances_payment_period_id', 'idx_expense_instances_recurring_template_id',
    'idx_fuel_expenses_payment_period_id', 'idx_fuel_expenses_vehicle_id',
    'idx_payment_reports_payment_method_id', 'idx_payment_reports_payment_period_id',
    'idx_pending_expenses_applied_to_period_id', 'idx_pending_expenses_expense_instance_id', 'idx_pending_expenses_original_period_id',
    'idx_recurring_expense_templates_expense_type_id', 'idx_state_cities_state_id',
    'idx_vehicle_assignments_driver_id', 'idx_vehicle_assignments_vehicle_id', 'idx_vehicle_positions_vehicle_id',
    'idx_user_invitations_company_id'
  ],
  'impact', 'All foreign key constraints now have covering indexes for optimal performance'
));