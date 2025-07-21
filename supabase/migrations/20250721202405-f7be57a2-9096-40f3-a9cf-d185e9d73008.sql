-- NUCLEAR OPTION: Drop ALL triggers that might be causing issues
-- Check and drop all possible triggers that could be interfering

-- Drop all triggers from loads table that might be affecting load_stops
DROP TRIGGER IF EXISTS trigger_assign_load_to_company_payment_period ON public.loads;
DROP TRIGGER IF EXISTS trigger_update_load_company_payment_period ON public.loads;
DROP TRIGGER IF EXISTS trigger_auto_assign_payment_period ON public.loads;
DROP TRIGGER IF EXISTS trigger_inherit_owner_operator_percentages ON public.loads;
DROP TRIGGER IF EXISTS trigger_simple_assign_payment_period ON public.loads;

-- Drop any remaining triggers from load_stops
DROP TRIGGER IF EXISTS trigger_handle_load_stops_company_assignment ON public.load_stops;
DROP TRIGGER IF EXISTS trigger_assign_payment_period_after_stops ON public.load_stops;
DROP TRIGGER IF EXISTS trigger_simple_assign_payment_period ON public.load_stops;

-- Drop any triggers that might be related to assignment
DROP TRIGGER IF EXISTS trigger_assign_payment_period_simple ON public.loads;
DROP TRIGGER IF EXISTS trigger_update_payment_period_when_dates_change ON public.loads;
DROP TRIGGER IF EXISTS trigger_update_payment_period_on_date_change ON public.loads;