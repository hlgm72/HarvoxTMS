-- Fix final RLS performance warning: Part 4 - Inspections

-- 11. Fix inspections policy
DROP POLICY IF EXISTS "Inspections company access" ON public.inspections;
CREATE POLICY "Inspections company access" 
ON public.inspections 
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