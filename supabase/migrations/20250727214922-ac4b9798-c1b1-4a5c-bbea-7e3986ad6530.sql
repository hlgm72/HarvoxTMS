-- Fix auth function calls in company_payment_periods RLS policies for better performance
-- Replace auth.<function>() with (select auth.<function>()) to avoid re-evaluation per row

DROP POLICY IF EXISTS "Company payment periods select policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods insert policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods update policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods delete policy" ON public.company_payment_periods;

-- Create optimized policies using SELECT subqueries for auth functions
CREATE POLICY "Company payment periods select policy" 
ON public.company_payment_periods 
FOR SELECT 
USING (
  is_authenticated_company_user() AND 
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
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true
    )
  )
);

CREATE POLICY "Company payment periods update policy" 
ON public.company_payment_periods 
FOR UPDATE 
USING (
  is_authenticated_company_user() AND 
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  ))
)
WITH CHECK (
  is_authenticated_company_user() AND 
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
  is_authenticated_company_user() AND 
  is_company_owner_in_company(company_id)
);