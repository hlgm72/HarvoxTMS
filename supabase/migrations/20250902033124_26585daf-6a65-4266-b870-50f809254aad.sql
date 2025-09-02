-- Add unique constraint for expense_instances ON CONFLICT clause
ALTER TABLE expense_instances 
ADD CONSTRAINT expense_instances_payment_period_expense_type_unique 
UNIQUE (payment_period_id, expense_type_id);