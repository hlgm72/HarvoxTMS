-- Limpiar todas las políticas existentes en recurring_expense_templates
DROP POLICY IF EXISTS "Expense templates complete policy" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "Only company owners can delete expense templates" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "Recurring expense templates complete policy" ON public.recurring_expense_templates;

-- Crear políticas optimizadas y limpias

-- Política para SELECT - Conductores ven sus propias plantillas + Company members ven de su empresa
CREATE POLICY "recurring_expense_templates_select_policy"
  ON public.recurring_expense_templates
  FOR SELECT
  USING (
    (SELECT auth.role()) = 'service_role'::text OR
    ((SELECT auth.role()) = 'authenticated'::text AND (
      -- El conductor puede ver sus propias plantillas
      (SELECT auth.uid()) = driver_user_id OR
      -- Company members pueden ver plantillas de conductores de su empresa
      driver_user_id IN (
        SELECT ucr.user_id 
        FROM public.user_company_roles ucr
        WHERE ucr.company_id IN (
          SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
        ) AND ucr.is_active = true
      )
    ))
  );

-- Política para INSERT - Solo company members pueden crear plantillas
CREATE POLICY "recurring_expense_templates_insert_policy"
  ON public.recurring_expense_templates
  FOR INSERT
  WITH CHECK (
    (SELECT auth.role()) = 'service_role'::text OR
    ((SELECT auth.role()) = 'authenticated'::text AND
     driver_user_id IN (
       SELECT ucr.user_id 
       FROM public.user_company_roles ucr
       WHERE ucr.company_id IN (
         SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
       ) AND ucr.is_active = true
     ))
  );

-- Política para UPDATE - Company members pueden actualizar plantillas de su empresa
CREATE POLICY "recurring_expense_templates_update_policy"
  ON public.recurring_expense_templates
  FOR UPDATE
  USING (
    (SELECT auth.role()) = 'service_role'::text OR
    ((SELECT auth.role()) = 'authenticated'::text AND
     driver_user_id IN (
       SELECT ucr.user_id 
       FROM public.user_company_roles ucr
       WHERE ucr.company_id IN (
         SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
       ) AND ucr.is_active = true
     ))
  )
  WITH CHECK (
    (SELECT auth.role()) = 'service_role'::text OR
    ((SELECT auth.role()) = 'authenticated'::text AND
     driver_user_id IN (
       SELECT ucr.user_id 
       FROM public.user_company_roles ucr
       WHERE ucr.company_id IN (
         SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
       ) AND ucr.is_active = true
     ))
  );

-- Política para DELETE - Solo company owners y operations managers
CREATE POLICY "recurring_expense_templates_delete_policy"
  ON public.recurring_expense_templates
  FOR DELETE
  USING (
    (SELECT auth.role()) = 'service_role'::text OR
    ((SELECT auth.role()) = 'authenticated'::text AND
     driver_user_id IN (
       SELECT ucr.user_id 
       FROM public.user_company_roles ucr
       WHERE ucr.company_id IN (
         SELECT company_id FROM public.get_user_company_roles((SELECT auth.uid()))
       ) AND ucr.role IN ('company_owner', 'operations_manager')
       AND ucr.is_active = true
     ))
  );