-- ============================================
-- OPTIMIZAR RENDIMIENTO DE POLÍTICAS RLS
-- Prevenir re-evaluación de auth functions por cada fila
-- ============================================

-- Eliminar políticas existentes que tienen problemas de rendimiento
DROP POLICY "companies_secure_select_members_only" ON companies;
DROP POLICY "companies_secure_insert_superadmin_only" ON companies;
DROP POLICY "companies_secure_update_owners_only" ON companies;
DROP POLICY "companies_secure_delete_prohibited" ON companies;

-- Recrear políticas con auth functions optimizadas usando (select ...)

-- SELECT: Solo miembros de la empresa pueden ver datos de la empresa
CREATE POLICY "companies_secure_select_members_only" 
ON companies FOR SELECT 
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND 
  user_can_access_company(id)
);

-- INSERT: Solo superadmins pueden crear empresas
CREATE POLICY "companies_secure_insert_superadmin_only" 
ON companies FOR INSERT 
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND 
  user_is_superadmin()
);

-- UPDATE: Solo owners y superadmins pueden actualizar
CREATE POLICY "companies_secure_update_owners_only" 
ON companies FOR UPDATE 
USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND 
  (user_is_company_owner(id) OR user_is_superadmin())
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND 
  (user_is_company_owner(id) OR user_is_superadmin())
);

-- DELETE: Completamente prohibido (nunca permitir eliminación)
CREATE POLICY "companies_secure_delete_prohibited" 
ON companies FOR DELETE 
TO authenticated 
USING (
  false AND -- Nunca permitir eliminación
  (SELECT auth.uid()) IS NOT NULL AND -- Usuario debe estar autenticado (aunque la condición anterior ya lo bloquea)
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) -- No usuarios anónimos
);

-- Verificar que las políticas se crearon correctamente
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  permissive,
  qual
FROM pg_policies 
WHERE tablename = 'companies' 
ORDER BY policyname;