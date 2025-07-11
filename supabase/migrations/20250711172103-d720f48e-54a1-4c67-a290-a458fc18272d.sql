-- Fix all unindexed foreign keys shown in Performance Advisor
-- Adding indexes for specific foreign key constraints identified

-- Company broker dispatchers
CREATE INDEX IF NOT EXISTS idx_company_broker_dispatchers_broker_id ON public.company_broker_dispatchers(broker_id);

-- Company brokers  
CREATE INDEX IF NOT EXISTS idx_company_brokers_company_id ON public.company_brokers(company_id);

-- Company documents
CREATE INDEX IF NOT EXISTS idx_company_documents_company_id ON public.company_documents(company_id);

-- Driver profiles
CREATE INDEX IF NOT EXISTS idx_driver_profiles_license_state ON public.driver_profiles(license_state);

-- Expense instances (multiple foreign keys)
CREATE INDEX IF NOT EXISTS idx_expense_instances_expense_type_id ON public.expense_instances(expense_type_id);
CREATE INDEX IF NOT EXISTS idx_expense_instances_payment_period_id ON public.expense_instances(payment_period_id);
CREATE INDEX IF NOT EXISTS idx_expense_instances_recurring_template_id ON public.expense_instances(recurring_template_id);

-- Expense template history
CREATE INDEX IF NOT EXISTS idx_expense_template_history_template_id ON public.expense_template_history(template_id);

-- Fuel expenses
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_payment_period_id ON public.fuel_expenses(payment_period_id);
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_vehicle_id ON public.fuel_expenses(vehicle_id);

-- Load documents
CREATE INDEX IF NOT EXISTS idx_load_documents_load_id ON public.load_documents(load_id);

-- Load stops
CREATE INDEX IF NOT EXISTS idx_load_stops_load_id ON public.load_stops(load_id);

-- Other income
CREATE INDEX IF NOT EXISTS idx_other_income_payment_period_id ON public.other_income(payment_period_id);

-- Payment methods (multiple foreign keys)
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id ON public.payment_methods(company_id);
CREATE INDEX IF NOT EXISTS idx_payment_methods_created_by ON public.payment_methods(created_by);

-- Payment reports
CREATE INDEX IF NOT EXISTS idx_payment_reports_payment_method_id ON public.payment_reports(payment_method_id);
CREATE INDEX IF NOT EXISTS idx_payment_reports_payment_period_id ON public.payment_reports(payment_period_id);
CREATE INDEX IF NOT EXISTS idx_payment_reports_reported_by ON public.payment_reports(reported_by);
CREATE INDEX IF NOT EXISTS idx_payment_reports_verified_by ON public.payment_reports(verified_by);

-- Log the targeted fix
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('performance_advisor_targeted_fix', jsonb_build_object(
  'timestamp', now(),
  'foreign_key_indexes_added', 18,
  'description', 'Added indexes for all unindexed foreign keys identified in Performance Advisor',
  'tables_affected', ARRAY[
    'company_broker_dispatchers', 'company_brokers', 'company_documents', 
    'driver_profiles', 'expense_instances', 'expense_template_history', 
    'fuel_expenses', 'load_documents', 'load_stops', 'other_income', 
    'payment_methods', 'payment_reports'
  ]
));