-- Clean up duplicate expense_instances keeping only the most recent one
DELETE FROM expense_instances 
WHERE id NOT IN (
  SELECT DISTINCT ON (payment_period_id, expense_type_id) id
  FROM expense_instances
  ORDER BY payment_period_id, expense_type_id, created_at DESC
);

-- Now add the unique constraint
ALTER TABLE expense_instances 
ADD CONSTRAINT expense_instances_payment_period_expense_type_unique 
UNIQUE (payment_period_id, expense_type_id);