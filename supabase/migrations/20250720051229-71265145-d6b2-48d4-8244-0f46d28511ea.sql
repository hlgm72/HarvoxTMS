-- Limpiar referencias a la tabla payment_periods antigua antes de cambiar constraints

-- 1. Temporalmente establecer payment_period_id como NULL en todas las cargas
UPDATE public.loads 
SET payment_period_id = NULL
WHERE payment_period_id IS NOT NULL;

-- 2. Hacer lo mismo para fuel_expenses, expense_instances y other_income
UPDATE public.fuel_expenses 
SET payment_period_id = NULL
WHERE payment_period_id IS NOT NULL;

UPDATE public.expense_instances 
SET payment_period_id = NULL
WHERE payment_period_id IS NOT NULL;

UPDATE public.other_income 
SET payment_period_id = NULL
WHERE payment_period_id IS NOT NULL;