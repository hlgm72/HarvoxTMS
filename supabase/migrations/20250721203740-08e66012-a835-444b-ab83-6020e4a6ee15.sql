-- FOUND THE REAL CULPRITS! These triggers were NOT dropped in our previous migration
-- Let's eliminate ALL remaining triggers on load_stops

DROP TRIGGER IF EXISTS simple_assign_payment_period_trigger ON public.load_stops;
DROP TRIGGER IF EXISTS update_load_dates_clean_trigger ON public.load_stops;
DROP TRIGGER IF EXISTS update_load_stops_updated_at ON public.load_stops;

-- Also drop the problematic functions to be sure
DROP FUNCTION IF EXISTS public.simple_assign_payment_period();
DROP FUNCTION IF EXISTS public.update_load_dates_clean();