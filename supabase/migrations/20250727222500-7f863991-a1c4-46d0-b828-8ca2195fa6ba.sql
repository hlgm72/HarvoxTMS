-- Corregir recursión infinita en user_company_roles usando funciones SECURITY DEFINER

-- Primero eliminar las políticas problemáticas
DROP POLICY IF EXISTS "user_company_roles_authenticated_select" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_authenticated_update" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_authenticated_delete" ON public.user_company_roles;

-- Crear función SECURITY DEFINER para verificar si el usuario es admin de una empresa
CREATE OR REPLACE FUNCTION public.is_user_admin_in_any_company(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles
    WHERE user_id = user_id_param
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  );
$$;

-- Crear función SECURITY DEFINER para verificar si el usuario es admin de una empresa específica
CREATE OR REPLACE FUNCTION public.is_user_admin_of_company(user_id_param uuid, company_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles
    WHERE user_id = user_id_param
    AND company_id = company_id_param
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
    AND is_active = true
  );
$$;

-- Crear función SECURITY DEFINER para verificar si el usuario es superadmin
CREATE OR REPLACE FUNCTION public.is_user_superadmin_check(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_company_roles
    WHERE user_id = user_id_param
    AND role = 'superadmin'
    AND is_active = true
  );
$$;

-- Ahora crear políticas simples usando las funciones
CREATE POLICY "user_company_roles_select_policy" 
ON public.user_company_roles 
FOR SELECT 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  (user_id = auth.uid() OR 
   is_user_admin_of_company(auth.uid(), company_id) OR 
   is_user_superadmin_check(auth.uid()))
);

CREATE POLICY "user_company_roles_update_policy" 
ON public.user_company_roles 
FOR UPDATE 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  (is_user_admin_of_company(auth.uid(), company_id) OR 
   is_user_superadmin_check(auth.uid()))
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE
);

CREATE POLICY "user_company_roles_delete_policy" 
ON public.user_company_roles 
FOR DELETE 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  (is_user_admin_of_company(auth.uid(), company_id) OR 
   is_user_superadmin_check(auth.uid()))
);

-- Política de INSERT
CREATE POLICY "user_company_roles_insert_policy" 
ON public.user_company_roles 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  (is_user_admin_of_company(auth.uid(), company_id) OR 
   is_user_superadmin_check(auth.uid()))
);