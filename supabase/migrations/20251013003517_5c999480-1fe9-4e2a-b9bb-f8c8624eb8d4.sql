-- ===============================================
-- Corrección de seguridad: Políticas RLS
-- ===============================================

-- Arreglar políticas de user_payrolls para no permitir anónimos
DROP POLICY IF EXISTS "user_payrolls_delete" ON public.user_payrolls;
DROP POLICY IF EXISTS "user_payrolls_update" ON public.user_payrolls;

-- Recrear con require_authenticated_user() para mayor seguridad
CREATE POLICY "user_payrolls_update" ON public.user_payrolls FOR UPDATE
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND NOT is_locked 
  AND company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

CREATE POLICY "user_payrolls_delete" ON public.user_payrolls FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND NOT is_locked 
  AND company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = auth.uid() 
    AND is_active = true 
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);