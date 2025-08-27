-- Let's try a more explicit approach to completely block anonymous access
-- First check if RLS is enabled
SELECT schemaname, tablename, rowsecurity, forcerowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'recurring_expense_exclusions';

-- Drop all existing policies and create a very explicit one
DROP POLICY IF EXISTS "exclusions_company_access" ON public.recurring_expense_exclusions;

-- Create a policy that's extremely clear about blocking anonymous users
CREATE POLICY "exclusions_authenticated_only" ON public.recurring_expense_exclusions
FOR ALL 
TO authenticated  -- Explicitly only for authenticated users
USING (
  -- Double check: must be authenticated and not anonymous
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND public.can_access_recurring_exclusion(user_id, payment_period_id)
)
WITH CHECK (
  -- Same strict checks for inserts/updates
  auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND public.can_access_recurring_exclusion(user_id, payment_period_id)
);