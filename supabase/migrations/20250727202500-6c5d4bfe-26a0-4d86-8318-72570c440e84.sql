-- Solución integral para eliminar todos los warnings de acceso anónimo
-- Actualizar todas las políticas para usar explícitamente authenticated y excluir anon

-- 1. Actualizar políticas que usan TO authenticated para ser más restrictivas
-- Agregar verificación explícita de no anónimo a todas las políticas principales

-- Company-related policies
DROP POLICY IF EXISTS "Company client contacts complete policy" ON public.company_client_contacts;
CREATE POLICY "Company client contacts complete policy" ON public.company_client_contacts
FOR ALL TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  client_id IN (
    SELECT cc.id FROM company_clients cc
    WHERE cc.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  client_id IN (
    SELECT cc.id FROM company_clients cc
    WHERE cc.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Company clients complete policy" ON public.company_clients;
CREATE POLICY "Company clients complete policy" ON public.company_clients
FOR ALL TO authenticated
USING (public.is_authenticated_company_user() AND company_id IN (
  SELECT ucr.company_id FROM user_company_roles ucr
  WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
))
WITH CHECK (public.is_authenticated_company_user() AND company_id IN (
  SELECT ucr.company_id FROM user_company_roles ucr
  WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
));

DROP POLICY IF EXISTS "Company documents complete policy" ON public.company_documents;
CREATE POLICY "Company documents complete policy" ON public.company_documents
FOR ALL TO authenticated
USING (public.is_authenticated_company_user() AND company_id IN (
  SELECT ucr.company_id FROM user_company_roles ucr
  WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
))
WITH CHECK (public.is_authenticated_company_user() AND company_id IN (
  SELECT ucr.company_id FROM user_company_roles ucr
  WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
));

DROP POLICY IF EXISTS "Company drivers complete policy" ON public.company_drivers;
CREATE POLICY "Company drivers complete policy" ON public.company_drivers
FOR ALL TO authenticated
USING (
  public.is_authenticated_company_user() AND (
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
  public.is_authenticated_company_user() AND (SELECT auth.uid()) = user_id
);