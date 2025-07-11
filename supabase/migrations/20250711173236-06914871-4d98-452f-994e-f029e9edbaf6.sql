-- Fix all remaining multiple permissive RLS policies
-- Final comprehensive cleanup for expense_template_history and expense_types

-- 1. Fix expense_template_history table
DROP POLICY IF EXISTS "Company members can manage template history" ON public.expense_template_history;
DROP POLICY IF EXISTS "Company members can view template history" ON public.expense_template_history;

-- Create single unified policy for expense_template_history
CREATE POLICY "Expense template history unified policy" ON public.expense_template_history
FOR ALL TO authenticated
USING (
  template_id IN (
    SELECT ret.id
    FROM recurring_expense_templates ret
    JOIN user_company_roles ucr ON ret.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  )
)
WITH CHECK (
  template_id IN (
    SELECT ret.id
    FROM recurring_expense_templates ret
    JOIN user_company_roles ucr ON ret.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  )
);

-- 2. Fix expense_types table
DROP POLICY IF EXISTS "Company members can manage expense types" ON public.expense_types;
DROP POLICY IF EXISTS "Everyone can view expense types" ON public.expense_types;

-- Create single unified policy for expense_types
CREATE POLICY "Expense types unified policy" ON public.expense_types
FOR ALL TO authenticated
USING (
  -- All authenticated users can view expense types
  true
)
WITH CHECK (
  -- Only users with active company roles can manage expense types
  EXISTS (
    SELECT 1
    FROM user_company_roles
    WHERE user_id = (select auth.uid()) AND is_active = true
  )
);

-- Keep existing service role policies as they are separate and don't cause conflicts

-- 3. Update statistics about the comprehensive RLS optimization
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_policies_optimization_comprehensive', jsonb_build_object(
  'timestamp', now(),
  'description', 'Comprehensive cleanup of all remaining multiple permissive RLS policies',
  'tables_optimized', ARRAY['expense_template_history', 'expense_types'],
  'multiple_policies_removed', true,
  'auth_calls_optimized', true,
  'final_cleanup', true
));