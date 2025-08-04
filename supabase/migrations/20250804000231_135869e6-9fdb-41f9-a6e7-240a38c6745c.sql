-- Renombrar tabla recurring_expense_templates a expense_recurring_templates
ALTER TABLE public.recurring_expense_templates RENAME TO expense_recurring_templates;

-- Actualizar la columna recurring_template_id en expense_instances para mantener consistencia
-- (no necesita cambio ya que es solo una referencia por ID)

-- Actualizar la columna template_id en expense_template_history para mantener la referencia
-- (no necesita cambio ya que sigue apuntando al mismo ID)

-- Recrear las políticas RLS con el nuevo nombre de tabla
DROP POLICY IF EXISTS "recurring_expense_templates_delete" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "recurring_expense_templates_insert" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "recurring_expense_templates_select" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "recurring_expense_templates_update" ON public.expense_recurring_templates;

-- Recrear políticas con nombres actualizados
CREATE POLICY "expense_recurring_templates_delete" ON public.expense_recurring_templates
FOR DELETE USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() 
        AND ucr2.is_active = true
        AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
      )
      AND ucr.is_active = true
    )
    OR is_user_superadmin_safe(auth.uid())
  )
);

CREATE POLICY "expense_recurring_templates_insert" ON public.expense_recurring_templates
FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() 
        AND ucr2.is_active = true
        AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
      )
      AND ucr.is_active = true
    )
    OR is_user_superadmin_safe(auth.uid())
  )
);

CREATE POLICY "expense_recurring_templates_select" ON public.expense_recurring_templates
FOR SELECT USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    user_id = auth.uid()
    OR user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() 
        AND ucr2.is_active = true
      )
      AND ucr.is_active = true
    )
  )
);

CREATE POLICY "expense_recurring_templates_update" ON public.expense_recurring_templates
FOR UPDATE USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() 
        AND ucr2.is_active = true
        AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
      )
      AND ucr.is_active = true
    )
    OR is_user_superadmin_safe(auth.uid())
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() 
        AND ucr2.is_active = true
        AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
      )
      AND ucr.is_active = true
    )
    OR is_user_superadmin_safe(auth.uid())
  )
);