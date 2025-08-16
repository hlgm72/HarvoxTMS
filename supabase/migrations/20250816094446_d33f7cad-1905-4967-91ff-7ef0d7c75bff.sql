-- Fix multiple permissive policies warnings by removing duplicate RLS policies
-- Keep only the most comprehensive and secure policies

-- Remove duplicate policies on loads table
DROP POLICY IF EXISTS "loads_optimized_select" ON public.loads;
DROP POLICY IF EXISTS "loads_optimized_insert" ON public.loads;
DROP POLICY IF EXISTS "loads_optimized_update" ON public.loads;
DROP POLICY IF EXISTS "loads_optimized_delete" ON public.loads;

-- Remove duplicate policies on load_stops table
DROP POLICY IF EXISTS "load_stops_optimized_select" ON public.load_stops;
DROP POLICY IF EXISTS "load_stops_optimized_insert" ON public.load_stops;
DROP POLICY IF EXISTS "load_stops_optimized_update" ON public.load_stops;
DROP POLICY IF EXISTS "load_stops_optimized_delete" ON public.load_stops;

-- Remove duplicate policies on loads_archive table
DROP POLICY IF EXISTS "loads_archive_final" ON public.loads_archive;

-- The comprehensive policies (loads_company_access, load_stops_company_access, loads_archive_company_access) 
-- are already in place and provide complete security coverage, so no additional policies are needed.