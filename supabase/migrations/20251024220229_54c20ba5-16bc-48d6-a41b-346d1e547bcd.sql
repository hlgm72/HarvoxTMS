-- Remove obsolete trigger and function that references driver_period_calculations and description field
-- The simple_load_operation_with_deductions function already handles percentage deductions correctly

DROP TRIGGER IF EXISTS trigger_update_percentage_deductions ON public.loads;
DROP FUNCTION IF EXISTS auto_generate_percentage_deductions_on_update();

-- Also remove the insert trigger for the old function
DROP TRIGGER IF EXISTS trigger_auto_generate_percentage_deductions ON public.loads;
DROP FUNCTION IF EXISTS auto_generate_percentage_deductions() CASCADE;