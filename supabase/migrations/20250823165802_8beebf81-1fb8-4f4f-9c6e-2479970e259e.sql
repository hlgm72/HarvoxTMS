-- Fix the company_documents RLS policy to explicitly exclude anonymous users
-- This addresses the security linter warning about anonymous access

DROP POLICY IF EXISTS "company_documents_authenticated_users" ON public.company_documents;

CREATE POLICY "company_documents_secure_authenticated_users" 
ON public.company_documents 
FOR ALL
TO authenticated
USING (
  (auth.uid() IS NOT NULL) 
  AND (auth.role() = 'authenticated'::text) 
  AND (NOT COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false))
  AND (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
  ))
)
WITH CHECK (
  (auth.uid() IS NOT NULL) 
  AND (auth.role() = 'authenticated'::text) 
  AND (NOT COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false))
  AND (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
  ))
);