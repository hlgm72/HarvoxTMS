-- More targeted approach - just disable RLS and specific triggers
ALTER TABLE public.load_stops DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Load stops basic access" ON public.load_stops;

-- Only drop the specific trigger we know about
DROP TRIGGER IF EXISTS trigger_handle_load_stops_company_assignment ON public.load_stops;