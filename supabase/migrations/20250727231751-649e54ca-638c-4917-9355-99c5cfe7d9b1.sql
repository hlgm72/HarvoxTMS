-- Optimizar la política RLS de company_equipment para mejor performance
DROP POLICY IF EXISTS "Company equipment access policy" ON company_equipment;

CREATE POLICY "Company equipment access policy" 
ON company_equipment 
FOR ALL 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE 
  AND company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE 
  AND company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  )
);