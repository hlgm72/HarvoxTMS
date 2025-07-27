-- Final fix for anonymous access in company_payment_periods
-- Use the existing authenticated helper functions for more explicit blocking

-- Remove ALL existing policies first
DROP POLICY IF EXISTS "Company payment periods select policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods insert policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods update policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods delete policy" ON public.company_payment_periods;

-- Create new policies that explicitly block anonymous users and use existing helper functions
CREATE POLICY "Company payment periods select policy" 
ON public.company_payment_periods 
FOR SELECT 
TO authenticated 
USING (
  require_authenticated_user() AND
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
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
    WHERE ucr.user_id = auth.uid() 
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
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
  ))
)
WITH CHECK (
  require_authenticated_user() AND
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
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