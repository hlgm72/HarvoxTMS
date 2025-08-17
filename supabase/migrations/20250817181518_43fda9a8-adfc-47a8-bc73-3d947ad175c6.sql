-- ============================================
-- FORZAR ELIMINACIÓN Y RECREACIÓN DE POLÍTICAS SEGURAS
-- ============================================

-- Deshabilitar RLS temporalmente para poder eliminar políticas
ALTER TABLE companies DISABLE ROW LEVEL SECURITY;

-- Forzar eliminación de todas las políticas existentes
DROP POLICY IF EXISTS "companies_basic_info_members_only" ON companies;
DROP POLICY IF EXISTS "companies_delete_superadmin_only" ON companies;
DROP POLICY IF EXISTS "companies_insert_superadmin_only" ON companies;
DROP POLICY IF EXISTS "companies_update_authorized_roles_only" ON companies;

-- Habilitar RLS nuevamente
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- ============================================
-- CREAR POLÍTICAS DE SEGURIDAD ESTRICTAS
-- ============================================

-- SELECT: Solo usuarios con membresía activa en ESA empresa específica (NO MÁS ACCESO GLOBAL PARA SUPERADMINS)
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

-- Verificar las nuevas políticas
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  permissive
FROM pg_policies 
WHERE tablename = 'companies' 
ORDER BY policyname;