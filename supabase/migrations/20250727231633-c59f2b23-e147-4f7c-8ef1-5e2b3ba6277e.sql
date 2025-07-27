-- Actualizar la política RLS de company_equipment para que sea más simple y confiable
DROP POLICY IF EXISTS "Company equipment access policy" ON company_equipment;

CREATE POLICY "Company equipment access policy" 
ON company_equipment 
FOR ALL 
USING (
  auth.uid() IS NOT NULL 
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE 
  AND company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND (auth.jwt()->>'is_anonymous')::boolean IS FALSE 
  AND company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
  )
);