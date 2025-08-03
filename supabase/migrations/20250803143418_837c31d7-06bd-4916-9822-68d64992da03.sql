-- Database Improvements: Clean data and add constraints
-- First clean up NULL values in expense_instances

-- Delete or fix expense_instances with NULL driver_user_id
DELETE FROM public.expense_instances 
WHERE driver_user_id IS NULL;

-- Now make the column NOT NULL
ALTER TABLE public.expense_instances 
ALTER COLUMN driver_user_id SET NOT NULL;

-- Create Foreign Key Constraints for data integrity
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