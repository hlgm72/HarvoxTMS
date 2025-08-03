-- Remove remaining unused indexes based on database linter suggestions
-- These indexes are showing as unused and can be safely removed

-- Remove unused indexes from loads table
DROP INDEX IF EXISTS idx_loads_driver_user_id;
DROP INDEX IF EXISTS idx_loads_payment_period_id;

-- Remove unused index from fuel_expenses table  
DROP INDEX IF EXISTS idx_fuel_expenses_driver_user_id;

-- Remove unused indexes from company_payment_periods table
DROP INDEX IF EXISTS idx_company_payment_periods_company_id;
DROP INDEX IF EXISTS idx_company_payment_periods_dates;
DROP INDEX IF EXISTS idx_company_payment_periods_company_dates;

-- Remove unused index from payment_methods table
DROP INDEX IF EXISTS idx_payment_methods_company_id;

-- Note: These indexes were created for potential future use but are currently unused
-- The database linter correctly identified them as candidates for removal
-- When these features become more active, we can recreate the necessary indexes