-- Simplificación cuidadosa del sistema de períodos de pago
-- Paso 1: Crear una función temporal para migrar los datos de forma segura

-- Primero, verificar y eliminar constraints existentes de manera segura
DO $$
BEGIN
    -- Remover constraint de fuel_expenses si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fuel_expenses_payment_period_id_fkey' 
        AND table_name = 'fuel_expenses'
    ) THEN
        ALTER TABLE public.fuel_expenses DROP CONSTRAINT fuel_expenses_payment_period_id_fkey;
    END IF;
    
    -- Remover constraint de expense_instances si existe
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'expense_instances_payment_period_id_fkey' 
        AND table_name = 'expense_instances'
    ) THEN
        ALTER TABLE public.expense_instances DROP CONSTRAINT expense_instances_payment_period_id_fkey;
    END IF;
END $$;

-- Paso 2: Actualizar fuel_expenses para apuntar directamente a company_payment_periods
UPDATE public.fuel_expenses 
SET payment_period_id = (
    SELECT dpc.company_payment_period_id 
    FROM public.driver_period_calculations dpc 
    WHERE dpc.id = fuel_expenses.payment_period_id
)
WHERE EXISTS (
    SELECT 1 FROM public.driver_period_calculations dpc 
    WHERE dpc.id = fuel_expenses.payment_period_id
);

-- Paso 3: Actualizar expense_instances para apuntar directamente a company_payment_periods  
UPDATE public.expense_instances 
SET payment_period_id = (
    SELECT dpc.company_payment_period_id 
    FROM public.driver_period_calculations dpc 
    WHERE dpc.id = expense_instances.payment_period_id
)
WHERE EXISTS (
    SELECT 1 FROM public.driver_period_calculations dpc 
    WHERE dpc.id = expense_instances.payment_period_id
);

-- Paso 4: Actualizar other_income si tiene registros
UPDATE public.other_income 
SET payment_period_id = (
    SELECT dpc.company_payment_period_id 
    FROM public.driver_period_calculations dpc 
    WHERE dpc.id = other_income.payment_period_id
)
WHERE EXISTS (
    SELECT 1 FROM public.driver_period_calculations dpc 
    WHERE dpc.id = other_income.payment_period_id
);

-- Paso 5: Crear las nuevas foreign key constraints apuntando a company_payment_periods
ALTER TABLE public.fuel_expenses 
ADD CONSTRAINT fuel_expenses_payment_period_id_fkey 
FOREIGN KEY (payment_period_id) 
REFERENCES public.company_payment_periods(id) 
ON DELETE SET NULL;

-- Paso 6: Agregar comentarios explicativos
COMMENT ON COLUMN public.fuel_expenses.payment_period_id 
IS 'Referencias company_payment_periods - período de empresa al que pertenece esta transacción';