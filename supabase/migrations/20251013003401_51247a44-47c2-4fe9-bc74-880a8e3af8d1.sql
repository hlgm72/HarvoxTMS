-- ===============================================
-- Corrección de advertencias de seguridad
-- ===============================================

-- Recrear políticas RLS más estrictas para user_payrolls
DROP POLICY IF EXISTS "user_payrolls_update" ON public.user_payrolls;
DROP POLICY IF EXISTS "user_payrolls_delete" ON public.user_payrolls;

-- Política UPDATE: debe ser autenticado, NO anónimo, NO locked, y tener permisos
CREATE POLICY "user_payrolls_update" ON public.user_payrolls FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE(((auth.jwt()->>'is_anonymous')::boolean), false)
  AND NOT is_locked 
  AND company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- Política DELETE: debe ser autenticado, NO anónimo, NO locked, y tener permisos
CREATE POLICY "user_payrolls_delete" ON public.user_payrolls FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE(((auth.jwt()->>'is_anonymous')::boolean), false)
  AND NOT is_locked 
  AND company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);