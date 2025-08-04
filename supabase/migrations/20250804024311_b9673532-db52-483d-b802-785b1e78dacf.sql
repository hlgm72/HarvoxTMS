-- Create other_income table
CREATE TABLE public.other_income (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  payment_period_id UUID NOT NULL,
  income_type TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  reference_number TEXT,
  income_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status TEXT NOT NULL DEFAULT 'approved',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on other_income table
ALTER TABLE public.other_income ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for other_income table
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