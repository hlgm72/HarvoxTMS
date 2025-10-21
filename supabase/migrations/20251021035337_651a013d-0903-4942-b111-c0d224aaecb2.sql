-- ===============================================
-- 🚨 AGREGAR POLÍTICA DELETE FALTANTE
-- Problema: No existe política DELETE en expense_instances
-- Solución: Permitir a managers eliminar expense_instances
-- ===============================================

-- Crear política DELETE para expense_instances
CREATE POLICY "expense_instances_delete_managers"
ON expense_instances
FOR DELETE
USING (
  auth.role() = 'authenticated'
  AND auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

COMMENT ON POLICY "expense_instances_delete_managers" ON expense_instances IS 
'Permite a company owners, operations managers y superadmins eliminar expense_instances de su compañía';