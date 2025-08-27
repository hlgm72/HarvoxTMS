-- The issue: anonymous users also use the 'authenticated' role in Supabase
-- Solution: Create a restrictive policy to block is_anonymous = true explicitly

-- Drop existing policy
DROP POLICY IF EXISTS "exclusions_secure_access" ON public.recurring_expense_exclusions;

-- Create a restrictive policy that explicitly blocks anonymous users
-- This follows the exact pattern from Supabase documentation
CREATE POLICY "exclusions_permanent_users_only" ON public.recurring_expense_exclusions
AS RESTRICTIVE  -- This is key - restrictive policy blocks anonymous
FOR ALL 
TO authenticated
USING (
  -- Explicitly block anonymous users as per Supabase docs
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE
);

-- Create the main access policy
CREATE POLICY "exclusions_authorized_access" ON public.recurring_expense_exclusions
FOR ALL 
TO authenticated
USING (
  public.has_exclusion_access(user_id, payment_period_id, (SELECT auth.uid()))
)
WITH CHECK (
  public.has_exclusion_access(user_id, payment_period_id, (SELECT auth.uid()))
);