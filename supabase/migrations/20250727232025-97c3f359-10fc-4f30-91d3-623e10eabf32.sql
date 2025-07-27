-- Verificar y optimizar las políticas RLS de equipment_assignments
DROP POLICY IF EXISTS "Equipment assignments company access" ON equipment_assignments;

CREATE POLICY "Equipment assignments company access" 
ON equipment_assignments 
FOR ALL 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE 
  AND (
    (SELECT auth.uid()) = driver_user_id 
    OR equipment_id IN (
      SELECT ce.id
      FROM company_equipment ce
      WHERE ce.company_id IN (
        SELECT ucr.company_id
        FROM user_company_roles ucr
        WHERE ucr.user_id = (SELECT auth.uid()) 
        AND ucr.is_active = true
      )
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE 
  AND equipment_id IN (
    SELECT ce.id
    FROM company_equipment ce
    WHERE ce.company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true
    )
  )
);