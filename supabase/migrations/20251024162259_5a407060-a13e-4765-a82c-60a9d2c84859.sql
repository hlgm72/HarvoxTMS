-- Add RLS policies for payment_reports table
-- This fixes the critical security issue where payment_reports has RLS enabled but no policies
-- payment_reports links to companies through payment_period_id -> company_payment_periods -> company_id

-- Allow company members to view their own company's payment reports
CREATE POLICY "payment_reports_company_members"
ON public.payment_reports
FOR SELECT
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS DISTINCT FROM true
  AND payment_period_id IN (
    SELECT cpp.id 
    FROM company_payment_periods cpp
    INNER JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
  )
);

-- Allow operations managers and owners to insert reports
CREATE POLICY "payment_reports_managers_insert"
ON public.payment_reports
FOR INSERT
TO authenticated
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS DISTINCT FROM true
  AND payment_period_id IN (
    SELECT cpp.id 
    FROM company_payment_periods cpp
    INNER JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- Allow operations managers and owners to update reports
CREATE POLICY "payment_reports_managers_update"
ON public.payment_reports
FOR UPDATE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS DISTINCT FROM true
  AND payment_period_id IN (
    SELECT cpp.id 
    FROM company_payment_periods cpp
    INNER JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS DISTINCT FROM true
  AND payment_period_id IN (
    SELECT cpp.id 
    FROM company_payment_periods cpp
    INNER JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);

-- Allow operations managers and owners to delete reports
CREATE POLICY "payment_reports_managers_delete"
ON public.payment_reports
FOR DELETE
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND ((SELECT auth.jwt())->>'is_anonymous')::boolean IS DISTINCT FROM true
  AND payment_period_id IN (
    SELECT cpp.id 
    FROM company_payment_periods cpp
    INNER JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
  )
);