-- Crear función simple SECURITY DEFINER para verificar superadmin sin recursión
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

-- Políticas súper simples para user_company_roles 

-- Política para SELECT - solo permite ver tus propios roles
CREATE POLICY "user_company_roles_own_select" 
ON public.user_company_roles 
FOR SELECT 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  user_id = auth.uid()
);

-- Política para superadmin - puede hacer todo
CREATE POLICY "user_company_roles_superadmin_access" 
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
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE
);