-- Create a security definer function to optimize recurring expense exclusions access
CREATE OR REPLACE FUNCTION private.can_access_exclusion_data(target_user_id UUID, target_period_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Get current user ID once
  current_user_id := auth.uid();
  
  -- Return false if no authenticated user
  IF current_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Return false if anonymous user
  IF COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) THEN
    RETURN FALSE;
  END IF;
  
  -- Allow access to own exclusions
  IF target_user_id = current_user_id THEN
    RETURN TRUE;
  END IF;
  
  -- Check if user has company access through the payment period
  RETURN EXISTS (
    SELECT 1
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE cpp.id = target_period_id
    AND ucr.user_id = current_user_id
    AND ucr.is_active = true
    AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role, 'superadmin'::user_role])
  );
END;
$$;

-- Drop and recreate the policy using the security definer function
DROP POLICY IF EXISTS "exclusions_company_access" ON public.recurring_expense_exclusions;

CREATE POLICY "exclusions_company_access" ON public.recurring_expense_exclusions
FOR ALL USING (
  private.can_access_exclusion_data(user_id, payment_period_id)
)
WITH CHECK (
  private.can_access_exclusion_data(user_id, payment_period_id)
);