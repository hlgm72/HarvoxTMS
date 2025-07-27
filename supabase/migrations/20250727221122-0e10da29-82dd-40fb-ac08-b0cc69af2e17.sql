-- Optimización FINAL para eliminar TODOS los warnings de auth_rls_initplan
-- Usar (select auth.*()) en lugar de auth.*() para optimización de performance

-- Eliminar políticas existentes problemáticas
DROP POLICY IF EXISTS "Company payment periods select policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods insert policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods update policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods delete policy" ON public.company_payment_periods;

DROP POLICY IF EXISTS "user_company_roles_select_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_insert_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_update_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_delete_policy" ON public.user_company_roles;

-- Crear funciones optimizadas que usan (select auth.*())
CREATE OR REPLACE FUNCTION public.get_current_user_id_optimized()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT (SELECT auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_authenticated_optimized()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND 
    (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE;
$$;

-- Políticas optimizadas para company_payment_periods
CREATE POLICY "Company payment periods select policy" 
ON public.company_payment_periods 
FOR SELECT 
TO authenticated 
USING (
  is_authenticated_optimized() AND
  company_id IN (
    SELECT get_user_admin_companies(get_current_user_id_optimized())
  )
);

CREATE POLICY "Company payment periods insert policy" 
ON public.company_payment_periods 
FOR INSERT 
TO authenticated
WITH CHECK (
  is_authenticated_optimized() AND
  company_id IN (
    SELECT get_user_admin_companies(get_current_user_id_optimized())
  )
);

CREATE POLICY "Company payment periods update policy" 
ON public.company_payment_periods 
FOR UPDATE 
TO authenticated
USING (
  is_authenticated_optimized() AND
  company_id IN (
    SELECT get_user_admin_companies(get_current_user_id_optimized())
  )
)
WITH CHECK (
  is_authenticated_optimized() AND
  company_id IN (
    SELECT get_user_admin_companies(get_current_user_id_optimized())
  )
);

CREATE POLICY "Company payment periods delete policy" 
ON public.company_payment_periods 
FOR DELETE 
TO authenticated
USING (
  is_authenticated_optimized() AND
  is_company_owner_in_company(company_id)
);

-- Políticas optimizadas para user_company_roles
CREATE POLICY "user_company_roles_select_policy" 
ON public.user_company_roles 
FOR SELECT 
TO authenticated
USING (
  is_authenticated_optimized() AND
  (
    user_id = get_current_user_id_optimized() OR
    is_superadmin(get_current_user_id_optimized()) OR
    user_is_admin_in_company(get_current_user_id_optimized(), company_id)
  )
);

CREATE POLICY "user_company_roles_insert_policy" 
ON public.user_company_roles 
FOR INSERT 
TO authenticated
WITH CHECK (
  is_authenticated_optimized() AND
  (
    is_superadmin(get_current_user_id_optimized()) OR
    user_is_admin_in_company(get_current_user_id_optimized(), company_id)
  )
);

CREATE POLICY "user_company_roles_update_policy" 
ON public.user_company_roles 
FOR UPDATE 
TO authenticated
USING (
  is_authenticated_optimized() AND
  (
    is_superadmin(get_current_user_id_optimized()) OR
    user_is_admin_in_company(get_current_user_id_optimized(), company_id)
  )
)
WITH CHECK (
  is_authenticated_optimized() AND
  (
    is_superadmin(get_current_user_id_optimized()) OR
    user_is_admin_in_company(get_current_user_id_optimized(), company_id)
  )
);

CREATE POLICY "user_company_roles_delete_policy" 
ON public.user_company_roles 
FOR DELETE 
TO authenticated
USING (
  is_authenticated_optimized() AND
  (
    (is_superadmin(get_current_user_id_optimized()) AND NOT (user_id = get_current_user_id_optimized() AND role = 'superadmin')) OR
    (user_is_admin_in_company(get_current_user_id_optimized(), company_id) AND NOT (user_id = get_current_user_id_optimized() AND role = 'company_owner'))
  )
);