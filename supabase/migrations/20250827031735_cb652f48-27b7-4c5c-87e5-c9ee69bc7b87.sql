-- Check current policy definition for recurring_expense_exclusions
SELECT policyname, definition 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'recurring_expense_exclusions' 
  AND policyname = 'exclusions_company_access';

-- Fix remaining auth function performance issues by ensuring ALL calls are optimized
DROP POLICY IF EXISTS "exclusions_company_access" ON public.recurring_expense_exclusions;

-- Create optimized policy with all auth functions properly wrapped
CREATE POLICY "exclusions_company_access" ON public.recurring_expense_exclusions
FOR ALL USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  NOT COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false) AND
  (
    user_id = (SELECT auth.uid()) OR
    payment_period_id IN (
      SELECT cpp.id
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
      AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  NOT COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false) AND
  (
    user_id = (SELECT auth.uid()) OR
    payment_period_id IN (
      SELECT cpp.id
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
      AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
    )
  )
);