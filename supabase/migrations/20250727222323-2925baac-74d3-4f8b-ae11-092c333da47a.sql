-- Corregir políticas de user_company_roles para excluir usuarios anónimos

DROP POLICY IF EXISTS "user_company_roles_delete_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_select_policy" ON public.user_company_roles;  
DROP POLICY IF EXISTS "user_company_roles_update_policy" ON public.user_company_roles;

-- Política de SELECT (lectura)
CREATE POLICY "user_company_roles_authenticated_select" 
ON public.user_company_roles 
FOR SELECT 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  (user_id = auth.uid() OR 
   company_id IN (
     SELECT ucr.company_id
     FROM user_company_roles ucr
     WHERE ucr.user_id = auth.uid()
       AND ucr.is_active = true
       AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
   ) OR 
   EXISTS (
     SELECT 1 FROM user_company_roles 
     WHERE user_id = auth.uid() 
     AND role = 'superadmin' 
     AND is_active = true
   ))
);

-- Política de UPDATE (actualización)
CREATE POLICY "user_company_roles_authenticated_update" 
ON public.user_company_roles 
FOR UPDATE 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'superadmin')
  ) OR 
  EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin' 
    AND is_active = true
  ))
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE
);

-- Política de DELETE (eliminación)  
CREATE POLICY "user_company_roles_authenticated_delete" 
ON public.user_company_roles 
FOR DELETE 
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND 
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role = 'company_owner'
  ) OR 
  EXISTS (
    SELECT 1 FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND role = 'superadmin' 
    AND is_active = true
  ))
);