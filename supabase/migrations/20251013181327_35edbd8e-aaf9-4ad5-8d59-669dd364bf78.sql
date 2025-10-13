-- ========================================
-- 🔧 FIX: Optimizar políticas existentes
-- ========================================
-- Actualizar políticas para usar (SELECT auth.uid()) en lugar de auth.uid()

-- Eliminar políticas existentes
DROP POLICY IF EXISTS expense_types_optimized_select ON expense_types;
DROP POLICY IF EXISTS expense_types_optimized_insert ON expense_types;
DROP POLICY IF EXISTS expense_types_optimized_update ON expense_types;
DROP POLICY IF EXISTS expense_types_optimized_delete ON expense_types;

-- Recrear con optimización correcta
CREATE POLICY expense_types_optimized_select ON expense_types
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND is_active = true
  )
);

CREATE POLICY expense_types_optimized_insert ON expense_types
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid())
    AND is_active = true
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

CREATE POLICY expense_types_optimized_update ON expense_types
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid())
    AND is_active = true
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid())
    AND is_active = true
    AND role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

CREATE POLICY expense_types_optimized_delete ON expense_types
FOR DELETE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND company_id IN (
    SELECT company_id 
    FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid())
    AND is_active = true
    AND role IN ('company_owner', 'superadmin')
  )
);