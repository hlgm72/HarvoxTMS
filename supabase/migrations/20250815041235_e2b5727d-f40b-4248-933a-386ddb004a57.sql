-- Consolidar políticas RLS de companies para evitar múltiples políticas permisivas
-- Eliminar todas las políticas existentes

DROP POLICY IF EXISTS "Companies insert for superadmins only" ON companies;
DROP POLICY IF EXISTS "Companies delete for superadmins only" ON companies;
DROP POLICY IF EXISTS "Companies select for company members only" ON companies;
DROP POLICY IF EXISTS "Company admins can update companies" ON companies;
DROP POLICY IF EXISTS "Service role limited access" ON companies;

-- Crear políticas unificadas que combinen ambos casos (usuarios + service role)
CREATE POLICY "Companies unified select policy" 
ON companies 
FOR SELECT 
USING (
  -- Permitir acceso de service role O usuarios autenticados con permisos
  (SELECT current_setting('app.service_operation', true)) = 'allowed' OR
  (
    (SELECT auth.uid()) IS NOT NULL AND 
    COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND 
    (
      id IN (
        SELECT ucr.company_id
        FROM user_company_roles ucr
        WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
      ) OR 
      is_user_superadmin_safe((SELECT auth.uid()))
    )
  )
);

CREATE POLICY "Companies unified insert policy" 
ON companies 
FOR INSERT 
WITH CHECK (
  -- Permitir acceso de service role O superadmins
  (SELECT current_setting('app.service_operation', true)) = 'allowed' OR
  (
    (SELECT auth.uid()) IS NOT NULL AND 
    COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND 
    is_user_superadmin_safe((SELECT auth.uid()))
  )
);

CREATE POLICY "Companies unified update policy" 
ON companies 
FOR UPDATE 
USING (
  -- Permitir acceso de service role O admins de empresa
  (SELECT current_setting('app.service_operation', true)) = 'allowed' OR
  (
    (SELECT auth.uid()) IS NOT NULL AND 
    COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND 
    user_is_admin_in_company((SELECT auth.uid()), id)
  )
)
WITH CHECK (
  -- Permitir acceso de service role O admins de empresa
  (SELECT current_setting('app.service_operation', true)) = 'allowed' OR
  (
    (SELECT auth.uid()) IS NOT NULL AND 
    COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND 
    user_is_admin_in_company((SELECT auth.uid()), id)
  )
);

CREATE POLICY "Companies unified delete policy" 
ON companies 
FOR DELETE 
USING (
  -- Permitir acceso de service role O superadmins
  (SELECT current_setting('app.service_operation', true)) = 'allowed' OR
  (
    (SELECT auth.uid()) IS NOT NULL AND 
    COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND 
    is_user_superadmin_safe((SELECT auth.uid()))
  )
);