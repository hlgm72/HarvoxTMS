-- Fix RLS performance issue on loads table
-- Replace auth.uid() with (SELECT auth.uid()) to avoid re-evaluation per row

DROP POLICY IF EXISTS "loads_authenticated_access" ON public.loads;

CREATE POLICY "loads_authenticated_access" ON public.loads
FOR ALL
USING (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND
  (
    -- Driver can see their own loads
    driver_user_id = (SELECT auth.uid()) OR
    -- Company users can see loads from their company
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      JOIN company_payment_periods cpp ON ucr.company_id = cpp.company_id
      WHERE ucr.user_id = (SELECT auth.uid())
        AND ucr.is_active = true
        AND (payment_period_id = cpp.id OR payment_period_id IS NULL)
    )
  )
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous')::boolean, false) AND
  (
    -- Allow insert/update if user has admin role in the company
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      JOIN company_payment_periods cpp ON ucr.company_id = cpp.company_id
      WHERE ucr.user_id = (SELECT auth.uid())
        AND ucr.is_active = true
        AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
        AND (payment_period_id = cpp.id OR payment_period_id IS NULL)
    )
  )
);