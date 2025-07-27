-- Fix anonymous user access in company_payment_periods RLS policies
-- Explicitly block anonymous users with more restrictive conditions

DROP POLICY IF EXISTS "Company payment periods select policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods insert policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods update policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods delete policy" ON public.company_payment_periods;

-- Create policies that explicitly deny anonymous users
CREATE POLICY "Company payment periods select policy" 
ON public.company_payment_periods 
FOR SELECT 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
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
    (SELECT auth.role()) = 'authenticated' AND
    (SELECT auth.uid()) IS NOT NULL AND 
    (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
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
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
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
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  is_company_owner_in_company(company_id)
);