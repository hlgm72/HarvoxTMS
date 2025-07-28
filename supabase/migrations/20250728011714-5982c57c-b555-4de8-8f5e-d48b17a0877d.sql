-- Limpiar todas las políticas duplicadas en recurring_expense_templates
-- Esto resuelve las advertencias de múltiples políticas permisivas

DO $$
DECLARE
    pol_name text;
BEGIN
    -- Obtener y eliminar TODAS las políticas existentes en recurring_expense_templates
    FOR pol_name IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'recurring_expense_templates' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON public.recurring_expense_templates', pol_name);
    END LOOP;
END $$;

-- Crear políticas únicas y optimizadas para recurring_expense_templates
CREATE POLICY "recurring_templates_select" 
ON public.recurring_expense_templates 
FOR SELECT 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE
  AND (
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
    )
    OR
    EXISTS (
      SELECT 1 FROM user_company_roles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role = 'superadmin' 
      AND is_active = true
    )
  )
);

CREATE POLICY "recurring_templates_insert" 
ON public.recurring_expense_templates 
FOR INSERT 
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE
  AND EXISTS (
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
);

CREATE POLICY "recurring_templates_update" 
ON public.recurring_expense_templates 
FOR UPDATE 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE
  AND EXISTS (
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
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE
  AND EXISTS (
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
);

CREATE POLICY "recurring_templates_delete" 
ON public.recurring_expense_templates 
FOR DELETE 
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE
  AND EXISTS (
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
);