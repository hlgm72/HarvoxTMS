-- Check current RLS policy for recurring_expense_exclusions
SELECT policy_name, definition 
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'recurring_expense_exclusions' 
  AND policy_name = 'exclusions_company_access';

-- Fix any remaining auth function performance issues
DROP POLICY IF EXISTS "exclusions_company_access" ON public.recurring_expense_exclusions;

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
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL AND 
  NOT COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false) AND
  (
    -- Users can only create exclusions for themselves or company drivers
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