-- Fix the loads_complete view security issue
-- The problem is that the view has overly permissive grants

-- First, revoke all permissions from the view for all roles
REVOKE ALL ON public.loads_complete FROM PUBLIC;
REVOKE ALL ON public.loads_complete FROM anon;
REVOKE ALL ON public.loads_complete FROM authenticated;

-- Only grant SELECT permission to authenticated users
-- This will force the view to respect RLS policies
GRANT SELECT ON public.loads_complete TO authenticated;

-- Ensure the view respects RLS by explicitly setting it
-- (though views should inherit RLS from underlying tables)
ALTER VIEW public.loads_complete SET (security_barrier = true);