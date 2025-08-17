-- ============================================
-- LIMPIAR POLÍTICAS INSEGURAS DEFINITIVAMENTE
-- ============================================

-- Eliminar todas las políticas inseguras que aún existen
DROP POLICY "companies_basic_info_members_only" ON companies;
DROP POLICY "companies_delete_superadmin_only" ON companies;
DROP POLICY "companies_insert_superadmin_only" ON companies;
DROP POLICY "companies_update_authorized_roles_only" ON companies;

-- Verificar que solo queden las políticas seguras
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