-- Update the security definer function to handle ALL auth checks
CREATE OR REPLACE FUNCTION public.can_access_recurring_exclusion(target_user_id UUID, target_period_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT CASE 
    -- All auth checks inside the security definer function
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

-- Create a completely clean policy with NO direct auth calls
DROP POLICY IF EXISTS "exclusions_authenticated_only" ON public.recurring_expense_exclusions;

CREATE POLICY "exclusions_authenticated_only" ON public.recurring_expense_exclusions
FOR ALL TO authenticated
USING (
  -- ONLY call our security definer function - no direct auth calls
  public.can_access_recurring_exclusion(user_id, payment_period_id)
)
WITH CHECK (
  -- Same here - only the function call
  public.can_access_recurring_exclusion(user_id, payment_period_id)
);