-- ============================================
-- APLICAR POLÍTICAS DE SEGURIDAD ESTRICTAS
-- ============================================

-- Asegurar que RLS esté habilitado
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREAR POLÍTICAS DE SEGURIDAD ESTRICTAS
-- ============================================

-- SELECT: Solo usuarios con membresía activa en ESA empresa específica 
-- (ELIMINAMOS el acceso global de superadmins para máxima seguridad)
CREATE POLICY "companies_secure_select_members_only" 
ON companies FOR SELECT 
TO authenticated 
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false)
  AND public.user_can_access_company(id)
);

-- INSERT: Solo superadmins pueden crear empresas
CREATE POLICY "companies_secure_insert_superadmin_only" 
ON companies FOR INSERT 
TO authenticated 
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false)
  AND public.user_is_superadmin()
);

-- UPDATE: Solo owners de la empresa específica + superadmins para casos especiales
CREATE POLICY "companies_secure_update_owners_only" 
ON companies FOR UPDATE 
TO authenticated 
USING (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false)
  AND (public.user_is_company_owner(id) OR public.user_is_superadmin())
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false)
  AND (public.user_is_company_owner(id) OR public.user_is_superadmin())
);

-- DELETE: Completamente prohibido por seguridad
CREATE POLICY "companies_secure_delete_prohibited" 
ON companies FOR DELETE 
TO authenticated 
USING (false);

-- Verificar las nuevas políticas creadas
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'companies' 
AND schemaname = 'public'
ORDER BY policyname;