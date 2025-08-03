-- Critical Database Improvements: Add Primary Keys and Essential Constraints

-- 1. Add Primary Keys to critical tables that are missing them
-- (Note: Some may already exist, using IF NOT EXISTS where possible)

-- Fix user_company_roles table
ALTER TABLE public.user_company_roles 
ADD PRIMARY KEY (id);

-- Fix companies table  
ALTER TABLE public.companies 
ADD PRIMARY KEY (id);

-- Fix company_clients table
ALTER TABLE public.company_clients 
ADD PRIMARY KEY (id);

-- Fix loads table
ALTER TABLE public.loads 
ADD PRIMARY KEY (id);

-- Fix fuel_expenses table
ALTER TABLE public.fuel_expenses 
ADD PRIMARY KEY (id);

-- Fix driver_profiles table
ALTER TABLE public.driver_profiles 
ADD PRIMARY KEY (id);

-- Fix company_payment_periods table
ALTER TABLE public.company_payment_periods 
ADD PRIMARY KEY (id);

-- Fix expense_instances table
ALTER TABLE public.expense_instances 
ADD PRIMARY KEY (id);

-- Fix company_equipment table
ALTER TABLE public.company_equipment 
ADD PRIMARY KEY (id);

-- Fix equipment_assignments table
ALTER TABLE public.equipment_assignments 
ADD PRIMARY KEY (id);

-- 2. Make critical ID columns NOT NULL where they should be
ALTER TABLE public.expense_instances 
ALTER COLUMN driver_user_id SET NOT NULL;

-- 3. Create Foreign Key Constraints for data integrity
-- user_company_roles -> companies
ALTER TABLE public.user_company_roles 
ADD CONSTRAINT fk_user_company_roles_company_id 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- company_clients -> companies
ALTER TABLE public.company_clients 
ADD CONSTRAINT fk_company_clients_company_id 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- loads -> companies (through user_company_roles)
-- Note: We'll add this as a more complex constraint after ensuring data consistency

-- fuel_expenses -> user_company_roles (driver)
-- Note: This would require a check function to ensure driver exists

-- equipment_assignments -> company_equipment
ALTER TABLE public.equipment_assignments 
ADD CONSTRAINT fk_equipment_assignments_equipment_id 
FOREIGN KEY (equipment_id) REFERENCES public.company_equipment(id) ON DELETE CASCADE;

-- equipment_assignments -> user_company_roles (driver)
-- Note: This would require a check function to ensure driver exists

-- 4. Create essential indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_company_roles_user_id 
ON public.user_company_roles(user_id);

CREATE INDEX IF NOT EXISTS idx_user_company_roles_company_id 
ON public.user_company_roles(company_id);

CREATE INDEX IF NOT EXISTS idx_company_clients_company_id 
ON public.company_clients(company_id);

CREATE INDEX IF NOT EXISTS idx_loads_driver_user_id 
ON public.loads(driver_user_id);

CREATE INDEX IF NOT EXISTS idx_loads_payment_period_id 
ON public.loads(payment_period_id);

CREATE INDEX IF NOT EXISTS idx_fuel_expenses_driver_user_id 
ON public.fuel_expenses(driver_user_id);

CREATE INDEX IF NOT EXISTS idx_fuel_expenses_payment_period_id 
ON public.fuel_expenses(payment_period_id);

CREATE INDEX IF NOT EXISTS idx_equipment_assignments_driver_user_id 
ON public.equipment_assignments(driver_user_id);

CREATE INDEX IF NOT EXISTS idx_equipment_assignments_equipment_id 
ON public.equipment_assignments(equipment_id);

-- 5. Create unique constraints where needed
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_company_roles_unique 
ON public.user_company_roles(user_id, company_id, role) 
WHERE is_active = true;