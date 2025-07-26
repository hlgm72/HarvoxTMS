-- Verificar si hay foreign keys incorrectas y corregir la estructura
-- La tabla fuel_expenses debería referenciar company_payment_periods, no payment_periods

-- Primero, eliminar cualquier foreign key constraint que pueda estar causando problemas
DO $$ 
BEGIN
    -- Intentar eliminar constraint si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fuel_expenses_payment_period_id_fkey' 
        AND table_name = 'fuel_expenses'
    ) THEN
        ALTER TABLE public.fuel_expenses DROP CONSTRAINT fuel_expenses_payment_period_id_fkey;
    END IF;
END $$;

-- Crear foreign key correcta hacia company_payment_periods
ALTER TABLE public.fuel_expenses 
ADD CONSTRAINT fuel_expenses_payment_period_id_fkey 
FOREIGN KEY (payment_period_id) 
REFERENCES public.company_payment_periods(id) 
ON DELETE CASCADE;