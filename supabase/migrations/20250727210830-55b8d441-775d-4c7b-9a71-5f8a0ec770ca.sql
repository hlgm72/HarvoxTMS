-- Continue fixing RLS performance warnings: Part 3 - Geotab tables

-- 7. Fix geotab_drivers policy
DROP POLICY IF EXISTS "Authenticated users can access geotab drivers" ON public.geotab_drivers;
CREATE POLICY "Authenticated users can access geotab drivers" 
ON public.geotab_drivers 
FOR SELECT TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (select auth.uid()) AND is_active = true
  )
);

-- 8. Fix geotab_vehicle_assignments policy
DROP POLICY IF EXISTS "Authenticated users can read vehicle assignments" ON public.geotab_vehicle_assignments;
CREATE POLICY "Authenticated users can read vehicle assignments" 
ON public.geotab_vehicle_assignments 
FOR SELECT TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (select auth.uid()) AND is_active = true
  )
);

-- 9. Fix geotab_vehicle_positions policy
DROP POLICY IF EXISTS "Authenticated users can read vehicle positions" ON public.geotab_vehicle_positions;
CREATE POLICY "Authenticated users can read vehicle positions" 
ON public.geotab_vehicle_positions 
FOR SELECT TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (select auth.uid()) AND is_active = true
  )
);

-- 10. Fix geotab_vehicles policy
DROP POLICY IF EXISTS "Authenticated users can read vehicles" ON public.geotab_vehicles;
CREATE POLICY "Authenticated users can read vehicles" 
ON public.geotab_vehicles 
FOR SELECT TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (select auth.uid()) AND is_active = true
  )
);