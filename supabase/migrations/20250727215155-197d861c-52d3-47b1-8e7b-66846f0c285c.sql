-- Fix anonymous user access in company_payment_periods RLS policies
-- Ensure anonymous users are explicitly denied access

DROP POLICY IF EXISTS "Company payment periods select policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods insert policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods update policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods delete policy" ON public.company_payment_periods;

-- Create policies that explicitly deny anonymous users
CREATE POLICY "Company payment periods select policy" 
ON public.company_payment_periods 
FOR SELECT 
USING (
  require_authenticated_user() AND 
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  ))
);

CREATE POLICY "Company payment periods insert policy" 
ON public.company_payment_periods 
FOR INSERT 
WITH CHECK (
  ((SELECT auth.role()) = 'service_role') OR 
  (
    require_authenticated_user() AND 
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager')
    )
  )
);

CREATE POLICY "Company payment periods update policy" 
ON public.company_payment_periods 
FOR UPDATE 
USING (
  require_authenticated_user() AND 
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  ))
)
WITH CHECK (
  require_authenticated_user() AND 
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  ))
);

CREATE POLICY "Company payment periods delete policy" 
ON public.company_payment_periods 
FOR DELETE 
USING (
  require_authenticated_user() AND 
  is_company_owner_in_company(company_id)
);