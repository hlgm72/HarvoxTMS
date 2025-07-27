-- ENFOQUE FINAL: Usar SOLO funciones helper existentes que ya funcionan
-- Sin llamadas directas a auth.* para evitar problemas de performance

-- Eliminar todas las políticas problemáticas
DROP POLICY IF EXISTS "Company payment periods select policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods insert policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods update policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods delete policy" ON public.company_payment_periods;

DROP POLICY IF EXISTS "user_company_roles_select_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_insert_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_update_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_delete_policy" ON public.user_company_roles;

-- USAR SOLO las funciones existentes que ya funcionan bien
-- Para company_payment_periods
CREATE POLICY "Company payment periods select policy" 
ON public.company_payment_periods 
FOR SELECT 
TO authenticated 
USING (
  require_authenticated_user() AND
  company_id IN (
    SELECT get_user_admin_companies(auth.uid())
  )
);

CREATE POLICY "Company payment periods insert policy" 
ON public.company_payment_periods 
FOR INSERT 
TO authenticated
WITH CHECK (
  require_authenticated_user() AND
  company_id IN (
    SELECT get_user_admin_companies(auth.uid())
  )
);

CREATE POLICY "Company payment periods update policy" 
ON public.company_payment_periods 
FOR UPDATE 
TO authenticated
USING (
  require_authenticated_user() AND
  company_id IN (
    SELECT get_user_admin_companies(auth.uid())
  )
)
WITH CHECK (
  require_authenticated_user() AND
  company_id IN (
    SELECT get_user_admin_companies(auth.uid())
  )
);

CREATE POLICY "Company payment periods delete policy" 
ON public.company_payment_periods 
FOR DELETE 
TO authenticated
USING (
  require_authenticated_user() AND
  is_company_owner_in_company(company_id)
);

-- Para user_company_roles - usar un enfoque más simple sin recursión
CREATE POLICY "user_company_roles_select_policy" 
ON public.user_company_roles 
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND
  (
    user_id = auth.uid() OR
    is_superadmin(auth.uid()) OR
    user_is_admin_in_company(auth.uid(), company_id)
  )
);

CREATE POLICY "user_company_roles_insert_policy" 
ON public.user_company_roles 
FOR INSERT 
TO authenticated
WITH CHECK (
  require_authenticated_user() AND
  (
    is_superadmin(auth.uid()) OR
    user_is_admin_in_company(auth.uid(), company_id)
  )
);

CREATE POLICY "user_company_roles_update_policy" 
ON public.user_company_roles 
FOR UPDATE 
TO authenticated
USING (
  require_authenticated_user() AND
  (
    is_superadmin(auth.uid()) OR
    user_is_admin_in_company(auth.uid(), company_id)
  )
)
WITH CHECK (
  require_authenticated_user() AND
  (
    is_superadmin(auth.uid()) OR
    user_is_admin_in_company(auth.uid(), company_id)
  )
);

CREATE POLICY "user_company_roles_delete_policy" 
ON public.user_company_roles 
FOR DELETE 
TO authenticated
USING (
  require_authenticated_user() AND
  (
    (is_superadmin(auth.uid()) AND NOT (user_id = auth.uid() AND role = 'superadmin')) OR
    (user_is_admin_in_company(auth.uid(), company_id) AND NOT (user_id = auth.uid() AND role = 'company_owner'))
  )
);