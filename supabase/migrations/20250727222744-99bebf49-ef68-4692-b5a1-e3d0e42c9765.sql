-- Eliminar TODAS las políticas y funciones problemáticas
DROP POLICY IF EXISTS "user_company_roles_own_select" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_superadmin_access" ON public.user_company_roles;

-- Eliminar las funciones que causan recursión
DROP FUNCTION IF EXISTS public.is_user_superadmin_check(uuid);
DROP FUNCTION IF EXISTS public.is_user_admin_of_company(uuid, uuid);
DROP FUNCTION IF EXISTS public.is_user_admin_in_any_company(uuid);

-- Crear políticas súper básicas que NO consulten user_company_roles
CREATE POLICY "user_company_roles_basic_access" 
ON public.user_company_roles 
FOR ALL 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  user_id = auth.uid()
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE
);