-- Fix security warnings: Update policies to exclude anonymous users

-- 1. Fix geotab_drivers policy
DROP POLICY IF EXISTS "Authenticated users can access geotab drivers" ON public.geotab_drivers;
CREATE POLICY "Authenticated users can access geotab drivers" 
ON public.geotab_drivers 
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 2. Fix geotab_vehicle_assignments policies
DROP POLICY IF EXISTS "Authenticated users can read vehicle assignments" ON public.geotab_vehicle_assignments;
CREATE POLICY "Authenticated users can read vehicle assignments" 
ON public.geotab_vehicle_assignments 
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 3. Fix geotab_vehicle_positions policies
DROP POLICY IF EXISTS "Authenticated users can read vehicle positions" ON public.geotab_vehicle_positions;
CREATE POLICY "Authenticated users can read vehicle positions" 
ON public.geotab_vehicle_positions 
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 4. Fix geotab_vehicles policies
DROP POLICY IF EXISTS "Authenticated users can read vehicles" ON public.geotab_vehicles;
CREATE POLICY "Authenticated users can read vehicles" 
ON public.geotab_vehicles 
FOR SELECT TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- 5. Fix inspections policy
DROP POLICY IF EXISTS "Inspections company access" ON public.inspections;
CREATE POLICY "Inspections company access" 
ON public.inspections 
FOR ALL TO authenticated
USING (
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  equipment_id IN (
    SELECT ce.id
    FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  equipment_id IN (
    SELECT ce.id
    FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);