-- Renombrar el campo driver_user_id por user_id en la tabla expense_instances
ALTER TABLE public.expense_instances 
RENAME COLUMN driver_user_id TO user_id;