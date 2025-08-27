-- Fix the RLS performance issue by recreating the policy with fully optimized auth calls
DROP POLICY IF EXISTS "exclusions_company_access" ON public.recurring_expense_exclusions;

-- Create fully optimized policy with all auth functions wrapped in SELECT
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