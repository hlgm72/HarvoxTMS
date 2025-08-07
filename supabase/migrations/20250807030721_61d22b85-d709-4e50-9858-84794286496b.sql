-- Remove duplicate RLS policies to fix performance warnings

-- 1. Remove old load_stops policies (keep optimized ones)
DROP POLICY IF EXISTS "load_stops_company_access" ON public.load_stops;

-- 2. Remove old loads policies (keep optimized ones) 
DROP POLICY IF EXISTS "loads_company_access" ON public.loads;

-- 3. Remove old other_income policies (keep optimized ones)
DROP POLICY IF EXISTS "other_income_company_select" ON public.other_income;
DROP POLICY IF EXISTS "other_income_company_insert" ON public.other_income;
DROP POLICY IF EXISTS "other_income_company_update" ON public.other_income;