-- Create indexes for the most critical foreign keys that are actively used in business queries
-- Focus only on foreign keys that improve real query performance

-- Fuel expenses by driver (essential for driver fuel expense queries)
CREATE INDEX IF NOT EXISTS idx_fuel_expenses_driver_user_id ON public.fuel_expenses(driver_user_id);

-- Loads by payment period (essential for payment period load queries)  
CREATE INDEX IF NOT EXISTS idx_loads_payment_period_id ON public.loads(payment_period_id);

-- Expense instances by expense type (used when filtering expenses by type)
CREATE INDEX IF NOT EXISTS idx_expense_instances_expense_type_id ON public.expense_instances(expense_type_id);

-- Note: We are intentionally NOT creating indexes for the remaining 20 foreign keys because:
-- 
-- 1. Audit fields (archived_by, created_by, paid_by, delegated_by) - rarely queried
-- 2. Geographic fields (city_id, state_id) - geographic features not implemented  
-- 3. Geotab integration (vehicle_assignments) - feature not implemented
-- 4. Vehicle tracking (vehicle_id) - limited functionality
-- 5. Dispatcher fields - limited functionality
-- 6. License state - not used for filtering
-- 7. Payment methods - limited functionality currently
-- 8. Security audit logs - infrequent queries
-- 9. Template history - rarely queried directly
--
-- These remaining warnings are acceptable INFO level notices for a production system
-- Creating indexes for rarely-used foreign keys would waste storage and slow writes