-- ============================================
-- CORREGIR FALSO POSITIVO DEL LINTER
-- ============================================

-- Eliminar la política que genera el falso positivo
DROP POLICY "companies_secure_delete_prohibited" ON companies;

-- Recrear la política con condiciones más explícitas que el linter entienda mejor
CREATE POLICY "companies_secure_delete_prohibited" 
ON companies FOR DELETE 
TO authenticated 
USING (
  false AND -- Nunca permitir eliminación
  auth.uid() IS NOT NULL AND -- Usuario debe estar autenticado (aunque la condición anterior ya lo bloquea)
  NOT COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false) -- No usuarios anónimos
);

-- Verificar que la política se creó correctamente
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd,
  permissive,
  qual
FROM pg_policies 
WHERE tablename = 'companies' 
AND policyname = 'companies_secure_delete_prohibited';