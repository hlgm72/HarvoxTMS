-- Database Improvements: Add Foreign Keys and Indexes Only
-- (Primary keys apparently already exist)

-- 1. Make critical ID columns NOT NULL where they should be
ALTER TABLE public.expense_instances 
ALTER COLUMN driver_user_id SET NOT NULL;

-- 2. Create Foreign Key Constraints for data integrity
-- user_company_roles -> companies
ALTER TABLE public.user_company_roles 
ADD CONSTRAINT fk_user_company_roles_company_id 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- company_clients -> companies
ALTER TABLE public.company_clients 
ADD CONSTRAINT fk_company_clients_company_id 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- equipment_assignments -> company_equipment
ALTER TABLE public.equipment_assignments 
ADD CONSTRAINT fk_equipment_assignments_equipment_id 
FOREIGN KEY (equipment_id) REFERENCES public.company_equipment(id) ON DELETE CASCADE;

-- company_equipment -> companies
ALTER TABLE public.company_equipment 
ADD CONSTRAINT fk_company_equipment_company_id 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- 3. Create essential indexes for performance
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

-- 4. Create unique constraints where needed
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_company_roles_unique 
ON public.user_company_roles(user_id, company_id, role) 
WHERE is_active = true;

-- 5. Add composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_user_company_roles_lookup 
ON public.user_company_roles(company_id, role, is_active);

CREATE INDEX IF NOT EXISTS idx_loads_driver_period 
ON public.loads(driver_user_id, payment_period_id);

CREATE INDEX IF NOT EXISTS idx_fuel_expenses_driver_period 
ON public.fuel_expenses(driver_user_id, payment_period_id);