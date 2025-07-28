-- Parte 2: Cambiar la estructura de la columna payment_period_id

-- Paso 1: Agregar nueva columna temporal
ALTER TABLE public.fuel_expenses 
ADD COLUMN company_payment_period_id UUID;

-- Paso 2: Poblar la nueva columna con los datos correctos (migrar datos existentes)
UPDATE public.fuel_expenses 
SET company_payment_period_id = dpc.company_payment_period_id
FROM public.driver_period_calculations dpc
WHERE public.fuel_expenses.payment_period_id = dpc.id;

-- Paso 3: Eliminar la columna antigua (ahora sin dependencias)
ALTER TABLE public.fuel_expenses 
DROP COLUMN payment_period_id;

-- Paso 4: Renombrar la nueva columna
ALTER TABLE public.fuel_expenses 
RENAME COLUMN company_payment_period_id TO payment_period_id;

-- Paso 5: Agregar constraint NOT NULL (ya que es requerido)
ALTER TABLE public.fuel_expenses 
ALTER COLUMN payment_period_id SET NOT NULL;

-- Paso 6: Agregar foreign key constraint
ALTER TABLE public.fuel_expenses 
ADD CONSTRAINT fk_fuel_expenses_payment_period 
FOREIGN KEY (payment_period_id) 
REFERENCES public.company_payment_periods(id) 
ON DELETE RESTRICT;

-- Paso 7: Crear índice para mejor performance
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_payment_period_id 
ON public.fuel_expenses(payment_period_id);