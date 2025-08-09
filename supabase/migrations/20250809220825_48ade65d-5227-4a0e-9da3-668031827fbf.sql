-- Add indexes for critical foreign keys that actually exist

-- Core business logic indexes - high priority
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_driver_user_id_new ON public.fuel_expenses(driver_user_id);
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_vehicle_id_new ON public.fuel_expenses(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_expense_instances_expense_type_id_new ON public.expense_instances(expense_type_id);

-- Load management indexes - only for existing columns
CREATE INDEX IF NOT EXISTS idx_loads_internal_dispatcher_id_new ON public.loads(internal_dispatcher_id);

-- Payment and company management
CREATE INDEX IF NOT EXISTS idx_payment_methods_company_id_new ON public.payment_methods(company_id);
CREATE INDEX IF NOT EXISTS idx_user_invitations_accepted_by ON public.user_invitations(accepted_by);

-- Driver management - useful for filtering by state
CREATE INDEX IF NOT EXISTS idx_driver_profiles_license_state ON public.driver_profiles(license_state);