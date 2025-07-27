-- Eliminar TODAS las políticas de user_company_roles y recrear desde cero

DROP POLICY IF EXISTS "user_company_roles_insert_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_select_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_update_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_delete_policy" ON public.user_company_roles;

-- Política simple para SELECT (solo permite que los usuarios vean sus propios roles)
CREATE POLICY "user_company_roles_simple_select" 
ON public.user_company_roles 
FOR SELECT 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  user_id = auth.uid()
);

-- Política simple para superadmin que puede hacer todo
CREATE POLICY "user_company_roles_superadmin_all" 
ON public.user_company_roles 
FOR ALL 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  is_user_superadmin_check(auth.uid())
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  is_user_superadmin_check(auth.uid())
);