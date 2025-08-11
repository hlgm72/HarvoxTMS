-- CORRECCIÓN: Quitar acceso de superadmin a expense_recurring_templates (datos sensibles de empresas)

-- Estos templates son para deducciones de conductores específicos - solo administradores de empresa

DROP POLICY IF EXISTS "expense_recurring_templates_delete_final" ON expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_insert_final" ON expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_update_final" ON expense_recurring_templates;

-- Solo administradores de empresa pueden gestionar deducciones de SUS conductores
CREATE POLICY "expense_recurring_templates_delete_company_only" ON expense_recurring_templates
  FOR DELETE
  TO authenticated
  USING (
    (SELECT auth.role()) = 'authenticated' 
    AND (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
    AND user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid())
        AND ucr2.is_active = true 
        AND ucr2.role IN ('company_owner', 'operations_manager')
      )
      AND ucr.is_active = true
    )
  );

CREATE POLICY "expense_recurring_templates_insert_company_only" ON expense_recurring_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated' 
    AND (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
    AND user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid())
        AND ucr2.is_active = true 
        AND ucr2.role IN ('company_owner', 'operations_manager')
      )
      AND ucr.is_active = true
    )
  );

CREATE POLICY "expense_recurring_templates_update_company_only" ON expense_recurring_templates
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT auth.role()) = 'authenticated' 
    AND (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
    AND user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid())
        AND ucr2.is_active = true 
        AND ucr2.role IN ('company_owner', 'operations_manager')
      )
      AND ucr.is_active = true
    )
  )
  WITH CHECK (
    (SELECT auth.role()) = 'authenticated' 
    AND (SELECT auth.uid()) IS NOT NULL 
    AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false 
    AND user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid())
        AND ucr2.is_active = true 
        AND ucr2.role IN ('company_owner', 'operations_manager')
      )
      AND ucr.is_active = true
    )
  );