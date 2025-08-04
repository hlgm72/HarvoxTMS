-- Clean up all existing RLS policies on expense_recurring_templates and create fully optimized ones

-- Drop ALL existing policies on expense_recurring_templates
DROP POLICY IF EXISTS "Users can view recurring_expense_templates for their company" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "Users can insert recurring_expense_templates for their company" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "Users can update recurring_expense_templates for their company" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "Users can delete recurring_expense_templates for their company" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_select" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_insert" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_update" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_delete" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_select_optimized" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_insert_optimized" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_update_optimized" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_delete_optimized" ON public.expense_recurring_templates;

-- Create new fully optimized policies with proper SELECT wrapping of all auth functions
CREATE POLICY "expense_recurring_templates_select_final" ON public.expense_recurring_templates
FOR SELECT USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE((SELECT (auth.jwt() ->> 'is_anonymous'))::boolean, false) = false 
  AND (
    user_id = (SELECT auth.uid()) 
    OR user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

CREATE POLICY "expense_recurring_templates_insert_final" ON public.expense_recurring_templates
FOR INSERT WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE((SELECT (auth.jwt() ->> 'is_anonymous'))::boolean, false) = false 
  AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) 
        AND ucr2.is_active = true 
        AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);

CREATE POLICY "expense_recurring_templates_update_final" ON public.expense_recurring_templates
FOR UPDATE USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE((SELECT (auth.jwt() ->> 'is_anonymous'))::boolean, false) = false 
  AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) 
        AND ucr2.is_active = true 
        AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
) WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE((SELECT (auth.jwt() ->> 'is_anonymous'))::boolean, false) = false 
  AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) 
        AND ucr2.is_active = true 
        AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);

CREATE POLICY "expense_recurring_templates_delete_final" ON public.expense_recurring_templates
FOR DELETE USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE((SELECT (auth.jwt() ->> 'is_anonymous'))::boolean, false) = false 
  AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) 
        AND ucr2.is_active = true 
        AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) 
    OR is_user_superadmin_safe((SELECT auth.uid()))
  )
);