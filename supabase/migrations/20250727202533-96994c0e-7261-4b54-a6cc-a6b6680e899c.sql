-- Continuar corrigiendo las políticas más críticas (lote 2)

-- Equipment and Payment related policies
DROP POLICY IF EXISTS "Company equipment access policy" ON public.company_equipment;
CREATE POLICY "Company equipment access policy" ON public.company_equipment
FOR ALL TO authenticated
USING (public.is_authenticated_company_user() AND company_id IN (
  SELECT ucr.company_id FROM user_company_roles ucr
  WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
))
WITH CHECK (public.is_authenticated_company_user() AND company_id IN (
  SELECT ucr.company_id FROM user_company_roles ucr
  WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
));

-- Payment periods policies
DROP POLICY IF EXISTS "Company payment periods select policy" ON public.company_payment_periods;
CREATE POLICY "Company payment periods select policy" ON public.company_payment_periods
FOR SELECT TO authenticated
USING (public.is_authenticated_company_user() AND company_id IN (
  SELECT ucr.company_id FROM user_company_roles ucr
  WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
));

DROP POLICY IF EXISTS "Company payment periods update policy" ON public.company_payment_periods;
CREATE POLICY "Company payment periods update policy" ON public.company_payment_periods
FOR UPDATE TO authenticated
USING (public.is_authenticated_company_user() AND company_id IN (
  SELECT ucr.company_id FROM user_company_roles ucr
  WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
))
WITH CHECK (public.is_authenticated_company_user() AND company_id IN (
  SELECT ucr.company_id FROM user_company_roles ucr
  WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
));

DROP POLICY IF EXISTS "Company payment periods delete policy" ON public.company_payment_periods;
CREATE POLICY "Company payment periods delete policy" ON public.company_payment_periods
FOR DELETE TO authenticated
USING (public.is_authenticated_company_user() AND is_company_owner_in_company(company_id));

-- Driver related policies
DROP POLICY IF EXISTS "Driver profiles complete policy" ON public.driver_profiles;
CREATE POLICY "Driver profiles complete policy" ON public.driver_profiles
FOR ALL TO authenticated
USING (
  public.is_authenticated_company_user() AND (
    (SELECT auth.uid()) = user_id OR 
    user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  public.is_authenticated_company_user() AND (SELECT auth.uid()) = user_id
);