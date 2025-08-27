-- Create an ultra-explicit policy that the linter can understand
DROP POLICY IF EXISTS "exclusions_authenticated_only" ON public.recurring_expense_exclusions;

-- Create two separate policies to be crystal clear about access control
CREATE POLICY "exclusions_no_anon_select" ON public.recurring_expense_exclusions
FOR SELECT TO authenticated
USING (
  public.can_access_recurring_exclusion(user_id, payment_period_id)
);

CREATE POLICY "exclusions_no_anon_insert" ON public.recurring_expense_exclusions  
FOR INSERT TO authenticated
WITH CHECK (
  public.can_access_recurring_exclusion(user_id, payment_period_id)
);

CREATE POLICY "exclusions_no_anon_update" ON public.recurring_expense_exclusions
FOR UPDATE TO authenticated
USING (
  public.can_access_recurring_exclusion(user_id, payment_period_id)
)
WITH CHECK (
  public.can_access_recurring_exclusion(user_id, payment_period_id)
);

CREATE POLICY "exclusions_no_anon_delete" ON public.recurring_expense_exclusions
FOR DELETE TO authenticated
USING (
  public.can_access_recurring_exclusion(user_id, payment_period_id)
);

-- Ensure no default policy exists for anon role
-- (This is just a check - there shouldn't be any)
DO $$
BEGIN
  -- Drop any potential anon policies if they exist
  DROP POLICY IF EXISTS "exclusions_anon_access" ON public.recurring_expense_exclusions;
END $$;