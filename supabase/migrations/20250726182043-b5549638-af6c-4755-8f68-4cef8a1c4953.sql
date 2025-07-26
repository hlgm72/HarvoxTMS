-- Performance Fix: Optimize RLS policies for better performance
-- Replace auth.uid() with (select auth.uid()) to avoid re-evaluation per row
-- Remove duplicate policies on user_company_roles

-- 1. Fix payment_reports policies
DROP POLICY IF EXISTS "Users can view payment reports for their company periods" ON public.payment_reports;
DROP POLICY IF EXISTS "Company managers can create payment reports" ON public.payment_reports;
DROP POLICY IF EXISTS "Company owners can update payment reports" ON public.payment_reports;
DROP POLICY IF EXISTS "Company owners can delete payment reports" ON public.payment_reports;

-- Recreate with optimized auth.uid() calls
CREATE POLICY "Users can view payment reports for their company periods"
ON public.payment_reports
FOR SELECT
USING (
  payment_period_id IN (
    SELECT dpc.id 
    FROM public.driver_period_calculations dpc
    JOIN public.company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (select auth.uid()) 
    AND ucr.is_active = true
  )
);

CREATE POLICY "Company managers can create payment reports"
ON public.payment_reports
FOR INSERT
WITH CHECK (
  payment_period_id IN (
    SELECT dpc.id 
    FROM public.driver_period_calculations dpc
    JOIN public.company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (select auth.uid()) 
    AND ucr.role IN ('company_owner', 'operations_manager')
    AND ucr.is_active = true
  )
);

CREATE POLICY "Company owners can update payment reports"
ON public.payment_reports
FOR UPDATE
USING (
  payment_period_id IN (
    SELECT dpc.id 
    FROM public.driver_period_calculations dpc
    JOIN public.company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (select auth.uid()) 
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

CREATE POLICY "Company owners can delete payment reports"
ON public.payment_reports
FOR DELETE
USING (
  payment_period_id IN (
    SELECT dpc.id 
    FROM public.driver_period_calculations dpc
    JOIN public.company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (select auth.uid()) 
    AND ucr.role = 'company_owner'
    AND ucr.is_active = true
  )
);

-- 2. Fix security_audit_log policy
DROP POLICY IF EXISTS "Superadmins can view audit logs" ON public.security_audit_log;

CREATE POLICY "Superadmins can view audit logs"
ON public.security_audit_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr 
    WHERE ucr.user_id = (select auth.uid()) 
    AND ucr.role = 'superadmin' 
    AND ucr.is_active = true
  )
);

-- 3. Fix user_company_roles - remove duplicate policies and optimize
-- Remove old policies first
DROP POLICY IF EXISTS "Restricted role management policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "User company roles SELECT policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "User company roles INSERT policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "User company roles UPDATE policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "User company roles DELETE policy" ON public.user_company_roles;

-- Create single comprehensive policy with optimized auth calls
CREATE POLICY "Optimized role management policy"
ON public.user_company_roles
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role' 
  OR 
  -- Superadmins have full access
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr 
    WHERE ucr.user_id = (select auth.uid()) 
    AND ucr.role = 'superadmin' 
    AND ucr.is_active = true
  )
  OR
  -- Company owners can manage roles within their companies (but not superadmin)
  (
    company_id IN (
      SELECT ucr.company_id FROM public.user_company_roles ucr 
      WHERE ucr.user_id = (select auth.uid()) 
      AND ucr.role = 'company_owner' 
      AND ucr.is_active = true
    )
    AND role != 'superadmin'
  )
  OR
  -- Users can view their own roles
  user_id = (select auth.uid())
)
WITH CHECK (
  -- Service role can insert/update anything
  auth.role() = 'service_role'
  OR
  -- Superadmins can insert/update anything
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr 
    WHERE ucr.user_id = (select auth.uid()) 
    AND ucr.role = 'superadmin' 
    AND ucr.is_active = true
  )
  OR
  -- Company owners can manage non-superadmin roles in their companies
  (
    company_id IN (
      SELECT ucr.company_id FROM public.user_company_roles ucr 
      WHERE ucr.user_id = (select auth.uid()) 
      AND ucr.role = 'company_owner' 
      AND ucr.is_active = true
    )
    AND role != 'superadmin'
  )
);