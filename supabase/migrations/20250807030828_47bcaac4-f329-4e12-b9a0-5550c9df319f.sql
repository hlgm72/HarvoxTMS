-- Remove specific duplicate RLS policies that are still causing conflicts

-- Remove the exact duplicate policies mentioned in the linter warnings

-- 1. Remove load_stops_company_access policy (keep the optimized ones)
DROP POLICY IF EXISTS "load_stops_company_access" ON public.load_stops;

-- 2. Remove loads_company_access policy (keep the optimized ones)  
DROP POLICY IF EXISTS "loads_company_access" ON public.loads;

-- 3. Remove specific other_income company policies (keep the optimized ones)
DROP POLICY IF EXISTS "other_income_company_select" ON public.other_income;
DROP POLICY IF EXISTS "other_income_company_insert" ON public.other_income;
DROP POLICY IF EXISTS "other_income_company_update" ON public.other_income;

-- Additional cleanup - check for any other variations that might exist
DROP POLICY IF EXISTS "other_income_select" ON public.other_income;
DROP POLICY IF EXISTS "other_income_insert" ON public.other_income;
DROP POLICY IF EXISTS "other_income_update" ON public.other_income;
DROP POLICY IF EXISTS "other_income_delete" ON public.other_income;

-- Remove any other potential duplicate policy names
DROP POLICY IF EXISTS "loads_select" ON public.loads;
DROP POLICY IF EXISTS "loads_insert" ON public.loads;
DROP POLICY IF EXISTS "loads_update" ON public.loads;
DROP POLICY IF EXISTS "loads_delete" ON public.loads;

DROP POLICY IF EXISTS "load_stops_select" ON public.load_stops;
DROP POLICY IF EXISTS "load_stops_insert" ON public.load_stops;
DROP POLICY IF EXISTS "load_stops_update" ON public.load_stops;
DROP POLICY IF EXISTS "load_stops_delete" ON public.load_stops;