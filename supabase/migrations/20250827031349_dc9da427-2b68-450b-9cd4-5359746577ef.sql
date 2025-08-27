-- Fix RLS performance issue for recurring_expense_exclusions table
-- The table doesn't have company_id, so we need to use proper relationships

-- Drop the existing policy
DROP POLICY IF EXISTS "exclusions_company_access" ON public.recurring_expense_exclusions;

-- Recreate the policy with optimized auth function calls and correct relationships
CREATE POLICY "exclusions_company_access" ON public.recurring_expense_exclusions
FOR ALL USING (
  (SELECT auth.uid()) IS NOT NULL AND 
  NOT COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false) AND
  (
    -- User can access their own exclusions
    user_id = (SELECT auth.uid()) OR
    -- Or if user has access to the payment period (company access)
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