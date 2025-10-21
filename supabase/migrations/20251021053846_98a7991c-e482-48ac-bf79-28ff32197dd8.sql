-- Drop the restrictive DELETE policy
DROP POLICY IF EXISTS "user_payrolls_delete" ON public.user_payrolls;

-- Create a new DELETE policy consistent with UPDATE policy
-- Allows company_owner, operations_manager, and superadmin to delete payrolls
CREATE POLICY "user_payrolls_delete" ON public.user_payrolls
FOR DELETE
TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
  AND EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = user_payrolls.company_id
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);