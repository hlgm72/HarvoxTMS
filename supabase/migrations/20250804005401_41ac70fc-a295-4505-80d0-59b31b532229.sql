-- Final optimization: Cache auth function results to prevent re-evaluation
-- Drop and recreate policies with proper auth function caching

DROP POLICY IF EXISTS "expense_recurring_templates_select_final" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_insert_final" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_update_final" ON public.expense_recurring_templates;
DROP POLICY IF EXISTS "expense_recurring_templates_delete_final" ON public.expense_recurring_templates;

-- Create fully optimized policies using security definer functions to avoid auth re-evaluation
CREATE POLICY "expense_recurring_templates_select_final" ON public.expense_recurring_templates
FOR SELECT USING (
  is_authenticated_non_anon() AND (
    user_id = get_current_user_id_optimized() 
    OR user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = get_current_user_id_optimized() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
);

CREATE POLICY "expense_recurring_templates_insert_final" ON public.expense_recurring_templates
FOR INSERT WITH CHECK (
  is_authenticated_non_anon() AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = get_current_user_id_optimized() 
        AND ucr2.is_active = true 
        AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) 
    OR is_user_superadmin_safe(get_current_user_id_optimized())
  )
);

CREATE POLICY "expense_recurring_templates_update_final" ON public.expense_recurring_templates
FOR UPDATE USING (
  is_authenticated_non_anon() AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = get_current_user_id_optimized() 
        AND ucr2.is_active = true 
        AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) 
    OR is_user_superadmin_safe(get_current_user_id_optimized())
  )
) WITH CHECK (
  is_authenticated_non_anon() AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = get_current_user_id_optimized() 
        AND ucr2.is_active = true 
        AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) 
    OR is_user_superadmin_safe(get_current_user_id_optimized())
  )
);

CREATE POLICY "expense_recurring_templates_delete_final" ON public.expense_recurring_templates
FOR DELETE USING (
  is_authenticated_non_anon() AND (
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE ucr2.user_id = get_current_user_id_optimized() 
        AND ucr2.is_active = true 
        AND ucr2.role = ANY(ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
      ) AND ucr.is_active = true
    ) 
    OR is_user_superadmin_safe(get_current_user_id_optimized())
  )
);