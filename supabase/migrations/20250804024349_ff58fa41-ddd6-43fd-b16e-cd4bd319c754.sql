-- Enable RLS on other_income table (if not already enabled)
ALTER TABLE public.other_income ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view other_income for their company" ON public.other_income;
DROP POLICY IF EXISTS "Company admins can insert other_income" ON public.other_income;
DROP POLICY IF EXISTS "Company admins can update other_income" ON public.other_income;
DROP POLICY IF EXISTS "Company admins can delete other_income" ON public.other_income;

-- Create new RLS policies for other_income table
CREATE POLICY "Users can view other_income for their company" 
ON public.other_income 
FOR SELECT 
USING (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()->>'is_anonymous')::boolean) IS FALSE) AND
  (
    -- User can see their own records
    user_id = (SELECT auth.uid()) OR
    -- Or records from their company
    payment_period_id IN (
      SELECT cpp.id
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);

CREATE POLICY "Company admins can insert other_income" 
ON public.other_income 
FOR INSERT 
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()->>'is_anonymous')::boolean) IS FALSE) AND
  payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND NOT cpp.is_locked
  )
);

CREATE POLICY "Company admins can update other_income" 
ON public.other_income 
FOR UPDATE 
USING (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()->>'is_anonymous')::boolean) IS FALSE) AND
  payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND NOT cpp.is_locked
  )
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()->>'is_anonymous')::boolean) IS FALSE) AND
  payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND NOT cpp.is_locked
  )
);

CREATE POLICY "Company admins can delete other_income" 
ON public.other_income 
FOR DELETE 
USING (
  (SELECT auth.role()) = 'authenticated' AND 
  (SELECT auth.uid()) IS NOT NULL AND 
  (((SELECT auth.jwt()->>'is_anonymous')::boolean) IS FALSE) AND
  payment_period_id IN (
    SELECT cpp.id
    FROM company_payment_periods cpp
    JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true AND NOT cpp.is_locked
  )
);