-- Fix expense_instances UPDATE policy to allow status changes to 'cancelled'
-- This is critical for administrative operations like cancelling deductions

DROP POLICY IF EXISTS "expense_instances_update_if_not_paid" ON public.expense_instances;

CREATE POLICY "expense_instances_update_with_cancellation" ON public.expense_instances
FOR UPDATE
USING (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
)
WITH CHECK (
  (select auth.role()) = 'authenticated'
  AND (select auth.uid()) IS NOT NULL
  AND NOT COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false)
  AND (
    -- Allow changing status to 'cancelled' at any time (administrative operation)
    status = 'cancelled'
    OR
    -- For other changes, verify period is not paid
    (
      payment_period_id IS NULL
      OR NOT EXISTS (
        SELECT 1 FROM user_payrolls up
        WHERE up.company_payment_period_id = expense_instances.payment_period_id
        AND up.payment_status = 'paid'
        AND up.user_id = expense_instances.user_id
      )
    )
  )
);