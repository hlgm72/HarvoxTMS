-- Fix security issues from linter warnings

-- 1. Fix function search_path mutable issue
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

-- 2. Drop old insecure load_stops policies that allow anonymous access
DROP POLICY IF EXISTS "Load stops company access - delete" ON public.load_stops;
DROP POLICY IF EXISTS "Load stops company access - select" ON public.load_stops;
DROP POLICY IF EXISTS "Load stops company access - update" ON public.load_stops;
DROP POLICY IF EXISTS "Load stops company access - insert" ON public.load_stops;