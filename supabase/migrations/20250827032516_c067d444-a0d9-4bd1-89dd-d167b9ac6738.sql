-- Check RLS status and create a very explicit policy
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND tablename = 'recurring_expense_exclusions';

-- Drop existing policy and create one with absolutely no anonymous access
DROP POLICY IF EXISTS "exclusions_company_access" ON public.recurring_expense_exclusions;

-- Create the most restrictive policy possible
CREATE POLICY "exclusions_authenticated_only" ON public.recurring_expense_exclusions
FOR ALL 
TO authenticated  -- Only authenticated role
USING (
  -- Triple check: authenticated, not anonymous, and has access
  auth.uid() IS NOT NULL 
  AND auth.role() = 'authenticated'
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND public.can_access_recurring_exclusion(user_id, payment_period_id)
)
WITH CHECK (
  -- Same triple check for modifications
  auth.uid() IS NOT NULL 
  AND auth.role() = 'authenticated'
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND public.can_access_recurring_exclusion(user_id, payment_period_id)
);