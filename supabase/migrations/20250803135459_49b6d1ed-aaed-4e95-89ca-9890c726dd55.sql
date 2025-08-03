-- Fix critical data integrity issues

-- 1. Add missing foreign key constraints for data integrity
ALTER TABLE public.user_company_roles 
ADD CONSTRAINT fk_user_company_roles_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- 2. Add foreign key for driver profiles
ALTER TABLE public.driver_profiles 
ADD CONSTRAINT fk_driver_profiles_user 
FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 3. Add foreign key for loads -> drivers
ALTER TABLE public.loads 
ADD CONSTRAINT fk_loads_driver 
FOREIGN KEY (driver_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. Add foreign key for fuel_expenses -> drivers  
ALTER TABLE public.fuel_expenses 
ADD CONSTRAINT fk_fuel_expenses_driver 
FOREIGN KEY (driver_user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- 5. Add foreign key for company_equipment -> companies
ALTER TABLE public.company_equipment 
ADD CONSTRAINT fk_company_equipment_company 
FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE CASCADE;

-- 6. Make critical fields NOT NULL where appropriate
ALTER TABLE public.companies 
ALTER COLUMN status SET NOT NULL,
ALTER COLUMN status SET DEFAULT 'active';

-- 7. Add missing updated_at columns with triggers
ALTER TABLE public.equipment_locations 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

ALTER TABLE public.load_documents 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

ALTER TABLE public.pending_expenses 
ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 8. Create trigger for auto-updating updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables missing them
CREATE TRIGGER update_equipment_locations_updated_at
    BEFORE UPDATE ON public.equipment_locations
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_load_documents_updated_at
    BEFORE UPDATE ON public.load_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pending_expenses_updated_at
    BEFORE UPDATE ON public.pending_expenses
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();