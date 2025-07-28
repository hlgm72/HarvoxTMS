-- Verificar y mejorar las políticas de recurring_expense_templates
-- Primero eliminamos cualquier política existente que pueda estar causando problemas

-- Revisar las políticas actuales
DO $$
BEGIN
  -- Eliminar políticas existentes para recrearlas
  DROP POLICY IF EXISTS "Users can view recurring templates for their company" ON public.recurring_expense_templates;
  DROP POLICY IF EXISTS "Company managers can delete recurring templates" ON public.recurring_expense_templates;
  DROP POLICY IF EXISTS "Company managers can insert recurring templates" ON public.recurring_expense_templates;
  DROP POLICY IF EXISTS "Company managers can update recurring templates" ON public.recurring_expense_templates;
  DROP POLICY IF EXISTS "Authenticated users can manage recurring templates" ON public.recurring_expense_templates;
END $$;

-- Crear políticas nuevas y más permisivas para recurring_expense_templates
CREATE POLICY "Recurring templates company access" 
ON public.recurring_expense_templates 
FOR ALL 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE
  AND (
    -- El usuario puede ver/editar plantillas de conductores de su empresa
    driver_user_id IN (
      SELECT ucr1.user_id 
      FROM user_company_roles ucr1
      WHERE ucr1.company_id IN (
        SELECT ucr2.company_id 
        FROM user_company_roles ucr2 
        WHERE ucr2.user_id = (SELECT auth.uid()) 
        AND ucr2.is_active = true
      )
      AND ucr1.is_active = true
      AND ucr1.role = 'driver'
    )
    OR
    -- O es superadmin
    EXISTS (
      SELECT 1 FROM user_company_roles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role = 'superadmin' 
      AND is_active = true
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE
  AND (
    -- Solo company_owner, operations_manager y superadmin pueden crear/modificar
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr.is_active = true
      AND (
        ucr.role = 'superadmin' 
        OR ucr.company_id IN (
          SELECT ucr2.company_id 
          FROM user_company_roles ucr2 
          WHERE ucr2.user_id = driver_user_id 
          AND ucr2.is_active = true
        )
      )
    )
  )
);