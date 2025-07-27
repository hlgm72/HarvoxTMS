-- Fix final anonymous access warnings for geographic reference tables

-- 1. Fix state_cities policy - require authentication but allow all authenticated users
DROP POLICY IF EXISTS "State cities public read access" ON public.state_cities;
CREATE POLICY "State cities authenticated read access" 
ON public.state_cities 
FOR SELECT TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE
);

-- 2. Fix states policy - require authentication but allow all authenticated users  
DROP POLICY IF EXISTS "States public read access" ON public.states;
CREATE POLICY "States authenticated read access" 
ON public.states 
FOR SELECT TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE
);