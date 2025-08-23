-- Optimize the company_documents RLS policy for better performance
-- Wrap auth functions in SELECT statements to prevent re-evaluation per row

DROP POLICY IF EXISTS "company_documents_secure_authenticated_users" ON public.company_documents;

CREATE POLICY "company_documents_optimized_access" 
ON public.company_documents 
FOR ALL
TO authenticated
USING (
  ((SELECT auth.uid()) IS NOT NULL) 
  AND ((SELECT auth.role()) = 'authenticated'::text) 
  AND (NOT COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'::text))::boolean, false))
  AND (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  ))
)
WITH CHECK (
  ((SELECT auth.uid()) IS NOT NULL) 
  AND ((SELECT auth.role()) = 'authenticated'::text) 
  AND (NOT COALESCE((((SELECT auth.jwt()) ->> 'is_anonymous'::text))::boolean, false))
  AND (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  ))
);