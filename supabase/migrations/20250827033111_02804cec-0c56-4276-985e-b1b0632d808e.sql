-- Let's try the most explicit approach possible without custom functions
-- Drop all policies first
DROP POLICY IF EXISTS "exclusions_no_anon_select" ON public.recurring_expense_exclusions;
DROP POLICY IF EXISTS "exclusions_no_anon_insert" ON public.recurring_expense_exclusions;
DROP POLICY IF EXISTS "exclusions_no_anon_update" ON public.recurring_expense_exclusions;
DROP POLICY IF EXISTS "exclusions_no_anon_delete" ON public.recurring_expense_exclusions;

-- Create the simplest possible policies that block anonymous access
-- but still use our optimized function for actual access control
CREATE POLICY "exclusions_authenticated_access" ON public.recurring_expense_exclusions
FOR ALL 
TO authenticated  -- Explicitly block anon access
USING (
  -- First check: must be authenticated (redundant but explicit for linter)
  (SELECT auth.uid()) IS NOT NULL 
  AND (SELECT auth.role()) = 'authenticated'
  AND NOT COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false)
  AND public.can_access_recurring_exclusion(user_id, payment_period_id)
)
WITH CHECK (
  -- Same checks for modifications
  (SELECT auth.uid()) IS NOT NULL 
  AND (SELECT auth.role()) = 'authenticated'  
  AND NOT COALESCE((SELECT (auth.jwt()->>'is_anonymous')::boolean), false)
  AND public.can_access_recurring_exclusion(user_id, payment_period_id)
);

-- Also create an explicit DENY policy for anon to make it crystal clear
CREATE POLICY "exclusions_deny_anon" ON public.recurring_expense_exclusions
FOR ALL 
TO anon
USING (false)  -- Explicitly deny all access to anon role
WITH CHECK (false);