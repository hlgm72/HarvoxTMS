-- Strategic approach: Only add indexes for most critical business operations
-- and remove unused ones to keep database lean

-- First, remove unused indexes we just created
DROP INDEX IF EXISTS public.idx_fuel_expenses_driver_user_id_new;
DROP INDEX IF EXISTS public.idx_fuel_expenses_vehicle_id_new; 
DROP INDEX IF EXISTS public.idx_expense_instances_expense_type_id_new;
DROP INDEX IF EXISTS public.idx_loads_internal_dispatcher_id_new;
DROP INDEX IF EXISTS public.idx_payment_methods_company_id_new;
DROP INDEX IF EXISTS public.idx_user_invitations_accepted_by;
DROP INDEX IF EXISTS public.idx_driver_profiles_license_state;

-- Add only the most critical indexes that are likely to be used frequently
-- Geographic searches for companies (likely used in filtering/reports)
CREATE INDEX IF NOT EXISTS idx_companies_city_id_critical ON public.companies(city_id) WHERE city_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_companies_state_id_critical ON public.companies(state_id);

-- Payment tracking (core business functionality)  
CREATE INDEX IF NOT EXISTS idx_payment_reports_payment_method_id_critical ON public.payment_reports(payment_method_id);

-- Security auditing (compliance requirement)
CREATE INDEX IF NOT EXISTS idx_security_audit_log_user_id_critical ON public.security_audit_log(user_id);

-- Core fuel management (high-frequency queries)
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_driver_critical ON public.fuel_expenses(driver_user_id, transaction_date);

-- Load assignment tracking (dispatch operations)
CREATE INDEX IF NOT EXISTS idx_loads_internal_dispatcher_critical ON public.loads(internal_dispatcher_id) WHERE internal_dispatcher_id IS NOT NULL;