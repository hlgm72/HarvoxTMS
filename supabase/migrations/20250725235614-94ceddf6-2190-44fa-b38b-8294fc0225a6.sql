-- Simplificación del sistema de períodos de pago
-- Paso 1: Actualizar foreign key de fuel_expenses para apuntar a company_payment_periods

-- Primero, remover la constraint existente si existe
ALTER TABLE public.fuel_expenses 
DROP CONSTRAINT IF EXISTS fuel_expenses_payment_period_id_fkey;

-- Actualizar los registros existentes para apuntar a company_payment_periods
-- En lugar de driver_period_calculations
UPDATE public.fuel_expenses 
SET payment_period_id = (
  SELECT dpc.company_payment_period_id 
  FROM public.driver_period_calculations dpc 
  WHERE dpc.id = fuel_expenses.payment_period_id
)
WHERE payment_period_id IN (
  SELECT id FROM public.driver_period_calculations
);

-- Agregar nueva foreign key constraint apuntando a company_payment_periods
ALTER TABLE public.fuel_expenses 
ADD CONSTRAINT fuel_expenses_payment_period_id_fkey 
FOREIGN KEY (payment_period_id) 
REFERENCES public.company_payment_periods(id) 
ON DELETE SET NULL;

-- Paso 2: Hacer lo mismo para otras tablas que usen driver_period_calculations

-- Actualizar expense_instances
UPDATE public.expense_instances 
SET payment_period_id = (
  SELECT dpc.company_payment_period_id 
  FROM public.driver_period_calculations dpc 
  WHERE dpc.id = expense_instances.payment_period_id
)
WHERE payment_period_id IN (
  SELECT id FROM public.driver_period_calculations
);

-- Actualizar other_income si existe
UPDATE public.other_income 
SET payment_period_id = (
  SELECT dpc.company_payment_period_id 
  FROM public.driver_period_calculations dpc 
  WHERE dpc.id = other_income.payment_period_id
)
WHERE payment_period_id IN (
  SELECT id FROM public.driver_period_calculations
);

-- Paso 3: Agregar comentarios para claridad
COMMENT ON COLUMN public.fuel_expenses.payment_period_id 
IS 'Referencias directamente company_payment_periods - el período de pago de la empresa al que pertenece esta transacción';

COMMENT ON COLUMN public.expense_instances.payment_period_id 
IS 'Referencias directamente company_payment_periods - el período de pago de la empresa al que pertenece este gasto';

-- Paso 4: La tabla driver_period_calculations será eliminada en una migración posterior
-- una vez confirmemos que todo funciona correctamente