-- Fix auth RLS initialization plan performance issues
-- Replace auth.uid() with (select auth.uid()) to evaluate once instead of per row

-- 1. Fix profiles_insert_company_managers policy
DROP POLICY IF EXISTS profiles_insert_company_managers ON public.profiles;
CREATE POLICY profiles_insert_company_managers 
ON public.profiles 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
);

-- 2. Fix profiles_update_company_managers policy
DROP POLICY IF EXISTS profiles_update_company_managers ON public.profiles;
CREATE POLICY profiles_update_company_managers 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
);

-- 3. Fix expense_instances_delete_managers policy
DROP POLICY IF EXISTS expense_instances_delete_managers ON public.expense_instances;
CREATE POLICY expense_instances_delete_managers 
ON public.expense_instances 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    JOIN public.company_payment_periods cpp ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
    AND cpp.id = expense_instances.payment_period_id
  )
);

-- 4. Fix user_payrolls_delete policy
DROP POLICY IF EXISTS user_payrolls_delete ON public.user_payrolls;
CREATE POLICY user_payrolls_delete 
ON public.user_payrolls 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
    AND ucr.company_id = user_payrolls.company_id
  )
  -- Only allow deletion if payroll is empty (no loads or other income)
  AND NOT EXISTS (
    SELECT 1 FROM public.loads l 
    WHERE l.payment_period_id = user_payrolls.company_payment_period_id
    AND l.driver_user_id = user_payrolls.user_id
  )
  AND NOT EXISTS (
    SELECT 1 FROM public.other_income oi 
    WHERE oi.payment_period_id = user_payrolls.company_payment_period_id
    AND oi.user_id = user_payrolls.user_id
  )
);