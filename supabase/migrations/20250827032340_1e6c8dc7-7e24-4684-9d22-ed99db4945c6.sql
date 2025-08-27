-- Create a security definer function to handle recurring expense exclusions access
-- This eliminates the per-row auth function calls that cause the performance warning
CREATE OR REPLACE FUNCTION public.can_access_recurring_exclusion(target_user_id UUID, target_period_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- Early return if not authenticated or anonymous
  SELECT CASE 
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

-- Drop and recreate the policy using the optimized security definer function
DROP POLICY IF EXISTS "exclusions_company_access" ON public.recurring_expense_exclusions;

CREATE POLICY "exclusions_company_access" ON public.recurring_expense_exclusions
FOR ALL USING (
  public.can_access_recurring_exclusion(user_id, payment_period_id)
)
WITH CHECK (
  public.can_access_recurring_exclusion(user_id, payment_period_id)
);