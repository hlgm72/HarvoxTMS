-- Verificar que RLS esté habilitado
ALTER TABLE public.recurring_expense_templates ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Drivers can view their own expense templates" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "Company members can view driver expense templates" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "Company members can create driver expense templates" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "Company members can update driver expense templates" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "Company owners can delete driver expense templates" ON public.recurring_expense_templates;

-- Política unificada para todas las operaciones excepto DELETE
CREATE POLICY "Expense templates complete policy"
  ON public.recurring_expense_templates
  FOR ALL
  USING (
    auth.role() = 'service_role'::text OR
    (auth.role() = 'authenticated'::text AND (
      -- El conductor puede ver sus propias plantillas
      auth.uid() = driver_user_id OR
      -- Company members pueden gestionar plantillas de conductores de su empresa
      driver_user_id IN (
        SELECT ucr.user_id 
        FROM public.user_company_roles ucr
        WHERE ucr.company_id IN (
          SELECT company_id FROM public.get_user_company_roles(auth.uid())
        ) AND ucr.is_active = true
      )
    ))
  )
  WITH CHECK (
    auth.role() = 'service_role'::text OR
    (auth.role() = 'authenticated'::text AND
     driver_user_id IN (
       SELECT ucr.user_id 
       FROM public.user_company_roles ucr
       WHERE ucr.company_id IN (
         SELECT company_id FROM public.get_user_company_roles(auth.uid())
       ) AND ucr.is_active = true
     ))
  );

-- Política específica para DELETE (solo company owners y operations managers)
CREATE POLICY "Only company owners can delete expense templates"
  ON public.recurring_expense_templates
  FOR DELETE
  USING (
    auth.role() = 'service_role'::text OR
    (auth.role() = 'authenticated'::text AND
     driver_user_id IN (
       SELECT ucr.user_id 
       FROM public.user_company_roles ucr
       WHERE ucr.company_id IN (
         SELECT company_id FROM public.get_user_company_roles(auth.uid())
       ) AND ucr.role IN ('company_owner', 'operations_manager')
       AND ucr.is_active = true
     ))
  );