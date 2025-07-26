-- Agregar columna driver_user_id a expense_instances para el nuevo modelo simplificado
ALTER TABLE public.expense_instances 
ADD COLUMN IF NOT EXISTS driver_user_id UUID;

-- Crear índice para mejor performance
CREATE INDEX IF NOT EXISTS idx_expense_instances_driver_user_id 
ON public.expense_instances(driver_user_id);

COMMENT ON COLUMN public.expense_instances.driver_user_id 
IS 'Driver user ID for the expense instance in the simplified payment period model';