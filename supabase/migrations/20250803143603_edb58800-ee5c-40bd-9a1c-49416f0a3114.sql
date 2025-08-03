-- Fix duplicate indexes warnings from database linter

-- Drop duplicate indexes on equipment_assignments table
-- Keep idx_equipment_assignments_driver_user_id and drop idx_equipment_assignments_driver_id
DROP INDEX IF EXISTS public.idx_equipment_assignments_driver_id;

-- Drop duplicate indexes on loads table  
-- Keep idx_loads_payment_period_id and drop idx_loads_payment_period
DROP INDEX IF EXISTS public.idx_loads_payment_period;