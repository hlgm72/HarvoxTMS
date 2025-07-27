-- FINAL solution: Fix performance issues while maintaining security
-- Use (select auth.uid()) to prevent per-row evaluation and existing helper functions

-- Remove all policies
DROP POLICY IF EXISTS "Company payment periods select policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods insert policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods update policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods delete policy" ON public.company_payment_periods;

-- Create optimized policies with (select auth.uid()) and helper functions
CREATE POLICY "Company payment periods select policy" 
ON public.company_payment_periods 
FOR SELECT 
TO authenticated 
USING (
  require_authenticated_user() AND
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) 
    AND ucr.is_active = true
  ))
);

CREATE POLICY "Company payment periods insert policy" 
ON public.company_payment_periods 
FOR INSERT 
TO authenticated
WITH CHECK (
  require_authenticated_user() AND
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) 
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager')
  )
);

CREATE POLICY "Company payment periods update policy" 
ON public.company_payment_periods 
FOR UPDATE 
TO authenticated
USING (
  require_authenticated_user() AND
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) 
    AND ucr.is_active = true
  ))
)
WITH CHECK (
  require_authenticated_user() AND
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) 
    AND ucr.is_active = true
  ))
);

CREATE POLICY "Company payment periods delete policy" 
ON public.company_payment_periods 
FOR DELETE 
TO authenticated
USING (
  require_authenticated_user() AND
  is_company_owner_in_company(company_id)
);