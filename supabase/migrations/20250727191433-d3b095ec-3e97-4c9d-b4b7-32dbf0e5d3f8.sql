-- Fix payment_reports policies with correct table references
-- The payment_periods table doesn't exist, we need to use driver_period_calculations

-- 28. Fix payment_reports policies (corrected)
DROP POLICY IF EXISTS "Users can view payment reports for their company periods" ON public.payment_reports;
CREATE POLICY "Users can view payment reports for their company periods" ON public.payment_reports
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE cpp.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Company owners can update payment reports" ON public.payment_reports;
CREATE POLICY "Company owners can update payment reports" ON public.payment_reports
FOR UPDATE 
TO authenticated
USING (
  require_authenticated_user() AND
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE cpp.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role = 'company_owner' 
      AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE cpp.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role = 'company_owner' 
      AND ucr.is_active = true
    )
  )
);

DROP POLICY IF EXISTS "Company owners can delete payment reports" ON public.payment_reports;
CREATE POLICY "Company owners can delete payment reports" ON public.payment_reports
FOR DELETE 
TO authenticated
USING (
  require_authenticated_user() AND
  payment_period_id IN (
    SELECT dpc.id FROM driver_period_calculations dpc
    JOIN company_payment_periods cpp ON dpc.company_payment_period_id = cpp.id
    WHERE cpp.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role = 'company_owner' 
      AND ucr.is_active = true
    )
  )
);

-- Fix other tables that remain
-- 26. Fix owner_operators
DROP POLICY IF EXISTS "Owner operators complete policy" ON public.owner_operators;
CREATE POLICY "Owner operators complete policy" ON public.owner_operators
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    auth.uid() = user_id OR
    user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND
  auth.uid() = user_id
);

-- 27. Fix payment_methods
DROP POLICY IF EXISTS "Payment methods comprehensive policy" ON public.payment_methods;
CREATE POLICY "Payment methods comprehensive policy" ON public.payment_methods
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);