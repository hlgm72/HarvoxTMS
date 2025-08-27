-- The issue is we still have direct auth calls in the policy
-- Let's move EVERYTHING to the security definer function

-- Update our function to be the ONLY place with auth calls
CREATE OR REPLACE FUNCTION public.can_access_recurring_exclusion(target_user_id UUID, target_period_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT CASE 
    -- ALL auth validation happens here, not in the policy
    WHEN auth.role() != 'authenticated' THEN FALSE
    WHEN auth.uid() IS NULL THEN FALSE
    WHEN COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) THEN FALSE
    -- Allow access to own exclusions
    WHEN target_user_id = auth.uid() THEN TRUE
    -- Check company access through payment period
    ELSE EXISTS (
      SELECT 1
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE cpp.id = target_period_id
      AND ucr.user_id = auth.uid()
      AND ucr.is_active = true
      AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
    )
  END;
$$;

-- Create a policy with ZERO auth calls - only the function
DROP POLICY IF EXISTS "exclusions_authenticated_access" ON public.recurring_expense_exclusions;
DROP POLICY IF EXISTS "exclusions_deny_anon" ON public.recurring_expense_exclusions;

-- Simple policy with NO direct auth calls whatsoever
CREATE POLICY "exclusions_access_via_function" ON public.recurring_expense_exclusions
FOR ALL TO authenticated
USING (
  -- ONLY our function - no auth calls here at all
  public.can_access_recurring_exclusion(user_id, payment_period_id)
)
WITH CHECK (
  -- Same - only the function
  public.can_access_recurring_exclusion(user_id, payment_period_id)
);