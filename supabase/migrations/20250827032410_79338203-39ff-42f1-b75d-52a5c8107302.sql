-- Fix the security warnings from the function and policy

-- 1. Fix the search_path issue by updating the function
CREATE OR REPLACE FUNCTION public.can_access_recurring_exclusion(target_user_id UUID, target_period_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
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

-- 2. Fix the anonymous access issue by restricting the policy to authenticated users only
DROP POLICY IF EXISTS "exclusions_company_access" ON public.recurring_expense_exclusions;

CREATE POLICY "exclusions_company_access" ON public.recurring_expense_exclusions
FOR ALL TO authenticated  -- Only authenticated users, no anonymous access
USING (
  public.can_access_recurring_exclusion(user_id, payment_period_id)
)
WITH CHECK (
  public.can_access_recurring_exclusion(user_id, payment_period_id)
);