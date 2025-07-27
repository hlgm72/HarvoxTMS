-- Fix RLS performance warnings: Optimize auth function calls to avoid re-evaluation per row

-- 1. Fix system_stats policy
DROP POLICY IF EXISTS "System stats superadmin access" ON public.system_stats;
CREATE POLICY "System stats superadmin access" 
ON public.system_stats 
FOR ALL TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  is_superadmin((select auth.uid()))
)
WITH CHECK (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  is_superadmin((select auth.uid()))
);

-- 2. Fix maintenance_records policy
DROP POLICY IF EXISTS "Maintenance records company access" ON public.maintenance_records;
CREATE POLICY "Maintenance records company access" 
ON public.maintenance_records 
FOR ALL TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  equipment_id IN (
    SELECT ce.id
    FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  equipment_id IN (
    SELECT ce.id
    FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
    )
  )
);

-- 3. Fix maintenance_schedules policy
DROP POLICY IF EXISTS "Maintenance schedules company access" ON public.maintenance_schedules;
CREATE POLICY "Maintenance schedules company access" 
ON public.maintenance_schedules 
FOR ALL TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  equipment_id IN (
    SELECT ce.id
    FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  equipment_id IN (
    SELECT ce.id
    FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
    )
  )
);