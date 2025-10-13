-- ========================================
-- 🔧 FIX: Eliminar políticas duplicadas
-- ========================================

DROP POLICY IF EXISTS expense_types_company_select ON expense_types;
DROP POLICY IF EXISTS expense_types_company_insert ON expense_types;
DROP POLICY IF EXISTS expense_types_company_update ON expense_types;
DROP POLICY IF EXISTS expense_types_company_delete ON expense_types;
DROP POLICY IF EXISTS expense_types_select ON expense_types;