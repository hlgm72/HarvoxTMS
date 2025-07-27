-- Corregir warning de performance en company_client_contacts
-- Usar la función optimizada en lugar de evaluaciones múltiples de auth

DROP POLICY IF EXISTS "Company client contacts complete policy" ON public.company_client_contacts;
CREATE POLICY "Company client contacts complete policy" ON public.company_client_contacts
FOR ALL TO authenticated
USING (
  public.is_authenticated_company_user() AND
  client_id IN (
    SELECT cc.id FROM company_clients cc
    WHERE cc.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  public.is_authenticated_company_user() AND
  client_id IN (
    SELECT cc.id FROM company_clients cc
    WHERE cc.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);