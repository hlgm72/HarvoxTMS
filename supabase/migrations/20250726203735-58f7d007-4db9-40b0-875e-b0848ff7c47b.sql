-- Corregir la foreign key de vehicle_id en fuel_expenses
-- Debe apuntar a company_equipment, no a geotab_vehicles

-- Eliminar la foreign key incorrecta si existe
DO $$ 
BEGIN
    -- Intentar eliminar constraint hacia geotab_vehicles si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fuel_expenses_vehicle_id_fkey' 
        AND table_name = 'fuel_expenses'
    ) THEN
        ALTER TABLE public.fuel_expenses DROP CONSTRAINT fuel_expenses_vehicle_id_fkey;
    END IF;
END $$;

-- Crear foreign key correcta hacia company_equipment
ALTER TABLE public.fuel_expenses 
ADD CONSTRAINT fuel_expenses_vehicle_id_fkey 
FOREIGN KEY (vehicle_id) 
REFERENCES public.company_equipment(id) 
ON DELETE SET NULL;