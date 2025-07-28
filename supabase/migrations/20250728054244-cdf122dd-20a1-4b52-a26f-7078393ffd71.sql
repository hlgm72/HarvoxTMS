-- Arreglar política de owner_operators para evitar problemas RLS
DROP POLICY IF EXISTS "Owner operators complete policy" ON public.owner_operators;

CREATE POLICY "Consolidated owner operators policy" ON public.owner_operators
FOR ALL 
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND (
    (SELECT auth.uid()) = user_id OR 
    user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()) ->> 'is_anonymous')::boolean IS FALSE) AND 
  (SELECT auth.uid()) = user_id
);