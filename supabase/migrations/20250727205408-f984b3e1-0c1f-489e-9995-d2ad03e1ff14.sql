-- Fix remaining security warnings for public reference tables and system stats

-- 10. Fix state_cities policy (these can remain public for location lookups)
DROP POLICY IF EXISTS "State cities comprehensive access" ON public.state_cities;
CREATE POLICY "State cities public read access" 
ON public.state_cities 
FOR SELECT 
USING (true);

-- 11. Fix states policy (these can remain public for location lookups)
DROP POLICY IF EXISTS "States comprehensive access" ON public.states;
CREATE POLICY "States public read access" 
ON public.states 
FOR SELECT 
USING (true);

-- 12. Fix system_stats policy
DROP POLICY IF EXISTS "System stats comprehensive access" ON public.system_stats;
CREATE POLICY "System stats superadmin access" 
ON public.system_stats 
FOR ALL TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  is_superadmin()
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  is_superadmin()
);