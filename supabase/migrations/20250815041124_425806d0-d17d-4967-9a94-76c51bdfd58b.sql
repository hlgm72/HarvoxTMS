-- Optimizar políticas RLS de companies para mejor rendimiento

DROP POLICY IF EXISTS "Companies insert for superadmins only" ON companies;
DROP POLICY IF EXISTS "Companies delete for superadmins only" ON companies;
DROP POLICY IF EXISTS "Companies select for company members only" ON companies;
DROP POLICY IF EXISTS "Service role limited access" ON companies;

-- Recrear políticas optimizadas
CREATE POLICY "Companies insert for superadmins only" 
ON companies 
FOR INSERT 
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND 
  is_user_superadmin_safe((SELECT auth.uid()))
);

CREATE POLICY "Companies delete for superadmins only" 
ON companies 
FOR DELETE 
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND 
  is_user_superadmin_safe((SELECT auth.uid()))
);

CREATE POLICY "Companies select for company members only" 
ON companies 
FOR SELECT 
USING (
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
);

CREATE POLICY "Service role limited access" 
ON companies 
FOR ALL 
USING (
  (SELECT current_setting('app.service_operation', true)) = 'allowed'
)
WITH CHECK (
  (SELECT current_setting('app.service_operation', true)) = 'allowed'
);