-- Let's try a completely different approach
-- Create a simple authentication check function
CREATE OR REPLACE FUNCTION public.is_authenticated_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL 
    AND auth.role() = 'authenticated' 
    AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false);
$$;

-- Create a separate function for access logic without auth checks
CREATE OR REPLACE FUNCTION public.has_exclusion_access(target_user_id UUID, target_period_id UUID, current_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT 
    -- Allow access to own exclusions
    target_user_id = current_user_id OR
    -- Check company access through payment period
    EXISTS (
      SELECT 1
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE cpp.id = target_period_id
      AND ucr.user_id = current_user_id
      AND ucr.is_active = true
      AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
    );
$$;

-- Drop all existing policies
DROP POLICY IF EXISTS "exclusions_authenticated_select" ON public.recurring_expense_exclusions;
DROP POLICY IF EXISTS "exclusions_authenticated_insert" ON public.recurring_expense_exclusions;
DROP POLICY IF EXISTS "exclusions_authenticated_update" ON public.recurring_expense_exclusions;
DROP POLICY IF EXISTS "exclusions_authenticated_delete" ON public.recurring_expense_exclusions;
DROP POLICY IF EXISTS "exclusions_block_anon_select" ON public.recurring_expense_exclusions;
DROP POLICY IF EXISTS "exclusions_block_anon_insert" ON public.recurring_expense_exclusions;
DROP POLICY IF EXISTS "exclusions_block_anon_update" ON public.recurring_expense_exclusions;
DROP POLICY IF EXISTS "exclusions_block_anon_delete" ON public.recurring_expense_exclusions;

-- Create a single, clear policy
CREATE POLICY "exclusions_secure_access" ON public.recurring_expense_exclusions
FOR ALL 
TO authenticated
USING (
  public.is_authenticated_user() 
  AND public.has_exclusion_access(user_id, payment_period_id, (SELECT auth.uid()))
)
WITH CHECK (
  public.is_authenticated_user() 
  AND public.has_exclusion_access(user_id, payment_period_id, (SELECT auth.uid()))
);