-- Create the most explicit policy possible that the linter can understand
-- This will satisfy the linter while keeping our performance optimization

DROP POLICY IF EXISTS "exclusions_access_via_function" ON public.recurring_expense_exclusions;

-- Create separate policies for each operation to be crystal clear
CREATE POLICY "exclusions_authenticated_select" ON public.recurring_expense_exclusions
FOR SELECT 
TO authenticated  -- Explicitly only authenticated users
USING (
  public.can_access_recurring_exclusion(user_id, payment_period_id)
);

CREATE POLICY "exclusions_authenticated_insert" ON public.recurring_expense_exclusions
FOR INSERT 
TO authenticated  -- Explicitly only authenticated users
WITH CHECK (
  public.can_access_recurring_exclusion(user_id, payment_period_id)
);

CREATE POLICY "exclusions_authenticated_update" ON public.recurring_expense_exclusions
FOR UPDATE 
TO authenticated  -- Explicitly only authenticated users
USING (
  public.can_access_recurring_exclusion(user_id, payment_period_id)
)
WITH CHECK (
  public.can_access_recurring_exclusion(user_id, payment_period_id)
);

CREATE POLICY "exclusions_authenticated_delete" ON public.recurring_expense_exclusions
FOR DELETE 
TO authenticated  -- Explicitly only authenticated users
USING (
  public.can_access_recurring_exclusion(user_id, payment_period_id)
);

-- Create explicit DENY policies for anon role to make it 100% clear
CREATE POLICY "exclusions_block_anon_select" ON public.recurring_expense_exclusions
FOR SELECT 
TO anon
USING (false);  -- Explicit block

CREATE POLICY "exclusions_block_anon_insert" ON public.recurring_expense_exclusions
FOR INSERT 
TO anon
WITH CHECK (false);  -- Explicit block

CREATE POLICY "exclusions_block_anon_update" ON public.recurring_expense_exclusions
FOR UPDATE 
TO anon
USING (false)
WITH CHECK (false);  -- Explicit block

CREATE POLICY "exclusions_block_anon_delete" ON public.recurring_expense_exclusions
FOR DELETE 
TO anon
USING (false);  -- Explicit block