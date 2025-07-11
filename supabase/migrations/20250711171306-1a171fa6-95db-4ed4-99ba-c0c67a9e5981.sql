-- Remove all unused indexes to improve database performance
-- These indexes are not being used and consume storage and maintenance overhead

-- Drop unused indexes from various tables
DROP INDEX IF EXISTS idx_state_cities_name;
DROP INDEX IF EXISTS idx_company_documents_type;
DROP INDEX IF EXISTS idx_company_documents_expires;
DROP INDEX IF EXISTS idx_driver_profiles_user_id;
DROP INDEX IF EXISTS idx_driver_profiles_license_state;
DROP INDEX IF EXISTS idx_driver_profiles_driver_id;
DROP INDEX IF EXISTS idx_user_company_roles_user_company_active;
DROP INDEX IF EXISTS idx_user_company_roles_company_role_active;
DROP INDEX IF EXISTS idx_companies_ein;
DROP INDEX IF EXISTS idx_companies_state_city;
DROP INDEX IF EXISTS idx_companies_status;
DROP INDEX IF EXISTS idx_companies_plan_type;
DROP INDEX IF EXISTS idx_companies_owner_email;
DROP INDEX IF EXISTS idx_owner_operators_user_id;
DROP INDEX IF EXISTS idx_owner_operators_active;
DROP INDEX IF EXISTS idx_owner_operators_business_name;
DROP INDEX IF EXISTS idx_company_drivers_user_id;
DROP INDEX IF EXISTS idx_company_brokers_active;
DROP INDEX IF EXISTS idx_company_broker_dispatchers_broker_id;
DROP INDEX IF EXISTS idx_company_broker_dispatchers_active;
DROP INDEX IF EXISTS idx_recurring_expense_templates_driver;
DROP INDEX IF EXISTS idx_recurring_expense_templates_active;
DROP INDEX IF EXISTS idx_expense_instances_period;
DROP INDEX IF EXISTS idx_expense_instances_status;
DROP INDEX IF EXISTS idx_pending_expenses_driver;
DROP INDEX IF EXISTS idx_pending_expenses_status;
DROP INDEX IF EXISTS idx_fuel_expenses_driver_user;
DROP INDEX IF EXISTS idx_fuel_expenses_payment_period;
DROP INDEX IF EXISTS idx_fuel_expenses_transaction_date;
DROP INDEX IF EXISTS idx_fuel_expenses_status;
DROP INDEX IF EXISTS idx_fuel_expenses_vehicle;
DROP INDEX IF EXISTS idx_fuel_expenses_driver_period;
DROP INDEX IF EXISTS idx_fuel_expenses_status_date;
DROP INDEX IF EXISTS idx_fuel_limits_driver;
DROP INDEX IF EXISTS idx_fuel_limits_active;
DROP INDEX IF EXISTS idx_other_income_driver_user;
DROP INDEX IF EXISTS idx_other_income_payment_period;
DROP INDEX IF EXISTS idx_other_income_date;
DROP INDEX IF EXISTS idx_other_income_status;
DROP INDEX IF EXISTS idx_other_income_type;
DROP INDEX IF EXISTS idx_payment_periods_driver_date;
DROP INDEX IF EXISTS idx_payment_periods_type;
DROP INDEX IF EXISTS idx_payment_periods_driver_status;
DROP INDEX IF EXISTS idx_payment_periods_driver_dates;
DROP INDEX IF EXISTS idx_loads_driver_user_id;
DROP INDEX IF EXISTS idx_loads_status;
DROP INDEX IF EXISTS idx_loads_pickup_date;
DROP INDEX IF EXISTS idx_loads_load_number;
DROP INDEX IF EXISTS idx_loads_driver_status;
DROP INDEX IF EXISTS idx_loads_dates;
DROP INDEX IF EXISTS idx_load_stops_load_id;
DROP INDEX IF EXISTS idx_load_stops_stop_number;
DROP INDEX IF EXISTS idx_load_documents_load_id;
DROP INDEX IF EXISTS idx_load_documents_type;
DROP INDEX IF EXISTS idx_password_reset_tokens_email;
DROP INDEX IF EXISTS idx_password_reset_tokens_expires;

-- Log the cleanup
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('unused_indexes_cleanup', jsonb_build_object(
  'timestamp', now(),
  'indexes_removed', 51,
  'description', 'Removed all unused indexes to improve database performance and reduce maintenance overhead'
));