-- Add performance indexes and unique constraints

-- Essential indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_company_roles_user_id 
ON public.user_company_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_company_roles_company_id 
ON public.user_company_roles(company_id);

CREATE INDEX IF NOT EXISTS idx_user_company_roles_active 
ON public.user_company_roles(is_active);

CREATE INDEX IF NOT EXISTS idx_company_clients_company_id 
ON public.company_clients(company_id);

CREATE INDEX IF NOT EXISTS idx_company_clients_active 
ON public.company_clients(is_active);

CREATE INDEX IF NOT EXISTS idx_loads_driver_user_id 
ON public.loads(driver_user_id);

CREATE INDEX IF NOT EXISTS idx_loads_payment_period_id 
ON public.loads(payment_period_id);

CREATE INDEX IF NOT EXISTS idx_loads_status 
ON public.loads(status);

CREATE INDEX IF NOT EXISTS idx_fuel_expenses_driver_user_id 
ON public.fuel_expenses(driver_user_id);

CREATE INDEX IF NOT EXISTS idx_fuel_expenses_payment_period_id 
ON public.fuel_expenses(payment_period_id);

CREATE INDEX IF NOT EXISTS idx_fuel_expenses_transaction_date 
ON public.fuel_expenses(transaction_date);

CREATE INDEX IF NOT EXISTS idx_equipment_assignments_driver_user_id 
ON public.equipment_assignments(driver_user_id);

CREATE INDEX IF NOT EXISTS idx_equipment_assignments_equipment_id 
ON public.equipment_assignments(equipment_id);

CREATE INDEX IF NOT EXISTS idx_equipment_assignments_active 
ON public.equipment_assignments(is_active);

CREATE INDEX IF NOT EXISTS idx_company_equipment_company_id 
ON public.company_equipment(company_id);

CREATE INDEX IF NOT EXISTS idx_company_equipment_status 
ON public.company_equipment(status);

-- Unique constraints where needed
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_company_roles_unique 
ON public.user_company_roles(user_id, company_id, role) 
WHERE is_active = true;

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_company_roles_lookup 
ON public.user_company_roles(company_id, role, is_active);

CREATE INDEX IF NOT EXISTS idx_loads_driver_period 
ON public.loads(driver_user_id, payment_period_id);

CREATE INDEX IF NOT EXISTS idx_fuel_expenses_driver_period 
ON public.fuel_expenses(driver_user_id, payment_period_id);

-- Index for company payment periods
CREATE INDEX IF NOT EXISTS idx_company_payment_periods_company_id 
ON public.company_payment_periods(company_id);

CREATE INDEX IF NOT EXISTS idx_company_payment_periods_status 
ON public.company_payment_periods(status);

CREATE INDEX IF NOT EXISTS idx_company_payment_periods_dates 
ON public.company_payment_periods(period_start_date, period_end_date);