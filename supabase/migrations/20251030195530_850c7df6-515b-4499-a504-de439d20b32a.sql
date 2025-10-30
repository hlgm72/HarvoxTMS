-- Fix: Make FK constraint DEFERRABLE so DELETE order doesn't matter

-- Drop old constraint
ALTER TABLE expense_instances 
DROP CONSTRAINT IF EXISTS expense_instances_cpp_fk;

-- Recreate with DEFERRABLE INITIALLY DEFERRED
ALTER TABLE expense_instances
ADD CONSTRAINT expense_instances_cpp_fk 
FOREIGN KEY (payment_period_id) 
REFERENCES company_payment_periods(id)
ON DELETE NO ACTION
DEFERRABLE INITIALLY DEFERRED;

-- Now the function will work because FK check happens at transaction end