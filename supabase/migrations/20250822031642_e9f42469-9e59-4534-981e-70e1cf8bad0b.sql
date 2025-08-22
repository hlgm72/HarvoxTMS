-- Eliminar la política existente que está causando problemas
DROP POLICY IF EXISTS "Company documents complete policy" ON public.company_documents;

-- Crear una nueva política más simple y funcional
CREATE POLICY "company_documents_authenticated_users"
ON public.company_documents
FOR ALL
TO authenticated
USING (
  -- Verificar que el usuario está autenticado y tiene acceso a la compañía
  auth.uid() IS NOT NULL AND
  auth.role() = 'authenticated' AND
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
)
WITH CHECK (
  -- Mismo check para INSERT/UPDATE
  auth.uid() IS NOT NULL AND
  auth.role() = 'authenticated' AND
  company_id IN (
    SELECT ucr.company_id 
    FROM user_company_roles ucr 
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);