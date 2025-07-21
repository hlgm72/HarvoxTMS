-- Temporarily disable RLS and create a simpler approach
-- First, drop the current policy and function
DROP POLICY IF EXISTS "Load stops access policy" ON public.load_stops;
DROP FUNCTION IF EXISTS public.can_access_load(uuid);

-- Disable RLS temporarily to test
ALTER TABLE public.load_stops DISABLE ROW LEVEL SECURITY;

-- We'll re-enable it with a simpler policy after testing
-- Create a very basic policy that should work
ALTER TABLE public.load_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Load stops basic access" ON public.load_stops
FOR ALL
USING (
  ((select auth.role()) = 'service_role') OR 
  ((select auth.role()) = 'authenticated')
)
WITH CHECK (
  ((select auth.role()) = 'service_role') OR 
  ((select auth.role()) = 'authenticated')
);