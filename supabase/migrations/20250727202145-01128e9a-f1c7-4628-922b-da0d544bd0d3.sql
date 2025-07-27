-- Revisar y corregir políticas RLS de la tabla companies para eliminar acceso anónimo

-- Eliminar cualquier política que permita acceso anónimo
DROP POLICY IF EXISTS "allow_anon_read_public_companies" ON public.companies;
DROP POLICY IF EXISTS "anon can read companies" ON public.companies;
DROP POLICY IF EXISTS "Companies public access" ON public.companies;

-- Asegurar que las políticas existentes solo permitan acceso autenticado
-- Recrear la política de SuperAdmin con restricción de usuario autenticado
DROP POLICY IF EXISTS "SuperAdmin complete access" ON public.companies;
CREATE POLICY "SuperAdmin complete access" ON public.companies
FOR ALL
TO authenticated
USING (
  require_authenticated_user() AND (
    is_superadmin() OR 
    id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND (
    is_superadmin() OR 
    EXISTS (
      SELECT 1
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
        AND ucr.company_id = companies.id 
        AND ucr.role = 'company_owner' 
        AND ucr.is_active = true
    )
  )
);

-- Verificar que no existan otras políticas problemáticas
-- Las políticas de service role son necesarias para el funcionamiento del sistema