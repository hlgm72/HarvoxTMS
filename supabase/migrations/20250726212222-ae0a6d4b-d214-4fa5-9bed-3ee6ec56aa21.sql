-- Agregar foreign key constraint si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'equipment_assignments_equipment_id_fkey' 
    AND table_name = 'equipment_assignments'
  ) THEN
    ALTER TABLE public.equipment_assignments 
    ADD CONSTRAINT equipment_assignments_equipment_id_fkey 
    FOREIGN KEY (equipment_id) 
    REFERENCES public.company_equipment(id) 
    ON DELETE CASCADE;
  END IF;
END $$;