-- Agregar columna driver_user_id a expense_instances para el nuevo modelo simplificado
ALTER TABLE public.expense_instances 
ADD COLUMN IF NOT EXISTS driver_user_id UUID;

-- Agregar foreign key constraint (opcional, pero recomendado)
-- ALTER TABLE public.expense_instances 
-- ADD CONSTRAINT fk_expense_instances_driver 
-- FOREIGN KEY (driver_user_id) REFERENCES auth.users(id);

-- Actualizar expense_instances existentes para poblara driver_user_id desde driver_period_calculations
UPDATE public.expense_instances 
SET driver_user_id = dpc.driver_user_id
FROM public.driver_period_calculations dpc
WHERE expense_instances.payment_period_id = dpc.id
AND expense_instances.driver_user_id IS NULL;

-- Crear índice para mejor performance
CREATE INDEX IF NOT EXISTS idx_expense_instances_driver_user_id 
ON public.expense_instances(driver_user_id);

-- Actualizar tabla fuel_expenses también para consistencia
ALTER TABLE public.fuel_expenses 
ADD COLUMN IF NOT EXISTS company_payment_period_id UUID;

-- Poblar company_payment_period_id en fuel_expenses desde payment_periods
UPDATE public.fuel_expenses 
SET company_payment_period_id = pp.company_payment_period_id
FROM public.payment_periods pp
WHERE fuel_expenses.payment_period_id = pp.id
AND fuel_expenses.company_payment_period_id IS NULL;

-- Crear índice para fuel_expenses también
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_company_payment_period 
ON public.fuel_expenses(company_payment_period_id);

COMMENT ON COLUMN public.expense_instances.driver_user_id 
IS 'Driver user ID for the expense instance in the simplified payment period model';

COMMENT ON COLUMN public.fuel_expenses.company_payment_period_id 
IS 'Company payment period ID for simplified payment period model';