-- Fix foreign key constraint for expense_instances.payment_period_id
-- It should reference driver_period_calculations.id, not company_payment_periods.id

-- Drop the existing foreign key constraint
ALTER TABLE public.expense_instances 
DROP CONSTRAINT IF EXISTS expense_instances_payment_period_id_fkey;

-- Add the correct foreign key constraint
ALTER TABLE public.expense_instances 
ADD CONSTRAINT expense_instances_payment_period_id_fkey 
FOREIGN KEY (payment_period_id) 
REFERENCES public.driver_period_calculations(id) 
ON DELETE CASCADE;