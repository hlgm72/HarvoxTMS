-- Actualizar las políticas RLS para usar user_id en lugar de driver_user_id
-- Nota: Las políticas existentes necesitan ser recreadas porque referencian la columna renombrada

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Users can view recurring_expense_templates for their company" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "Users can insert recurring_expense_templates for their company" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "Users can update recurring_expense_templates for their company" ON public.recurring_expense_templates;
DROP POLICY IF EXISTS "Users can delete recurring_expense_templates for their company" ON public.recurring_expense_templates;

-- Crear nuevas políticas usando user_id
CREATE POLICY "Users can view recurring_expense_templates for their company" 
ON public.recurring_expense_templates 
FOR SELECT 
USING (
  (auth.uid()) IS NOT NULL 
  AND COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false 
  AND (
    user_id = auth.uid() 
    OR user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

CREATE POLICY "Users can insert recurring_expense_templates for their company" 
ON public.recurring_expense_templates 
FOR INSERT 
WITH CHECK (
  (auth.uid()) IS NOT NULL 
  AND COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false 
  AND user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id
      FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

CREATE POLICY "Users can update recurring_expense_templates for their company" 
ON public.recurring_expense_templates 
FOR UPDATE 
USING (
  (auth.uid()) IS NOT NULL 
  AND COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false 
  AND user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id
      FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
)
WITH CHECK (
  (auth.uid()) IS NOT NULL 
  AND COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false 
  AND user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id
      FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);

CREATE POLICY "Users can delete recurring_expense_templates for their company" 
ON public.recurring_expense_templates 
FOR DELETE 
USING (
  (auth.uid()) IS NOT NULL 
  AND COALESCE(((auth.jwt() ->> 'is_anonymous'::text))::boolean, false) = false 
  AND user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id
      FROM user_company_roles ucr2
      WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
    ) AND ucr.is_active = true
  )
);