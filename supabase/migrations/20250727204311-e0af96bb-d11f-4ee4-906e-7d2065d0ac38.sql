-- Continuar resolviendo warnings de acceso anónimo - Segunda ronda
-- Cambiar más políticas críticas de 'TO authenticated' a 'TO service_role'

-- 1. COMPANY_PAYMENT_PERIODS - Crítico para pagos
DROP POLICY IF EXISTS "Company payment periods select policy" ON public.company_payment_periods;
CREATE POLICY "Company payment periods select policy" ON public.company_payment_periods
FOR SELECT
TO service_role
USING (is_authenticated_company_user() AND (company_id IN ( SELECT ucr.company_id
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))));

DROP POLICY IF EXISTS "Company payment periods update policy" ON public.company_payment_periods;
CREATE POLICY "Company payment periods update policy" ON public.company_payment_periods
FOR UPDATE
TO service_role
USING (is_authenticated_company_user() AND (company_id IN ( SELECT ucr.company_id
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))))
WITH CHECK (is_authenticated_company_user() AND (company_id IN ( SELECT ucr.company_id
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))));

DROP POLICY IF EXISTS "Company payment periods delete policy" ON public.company_payment_periods;
CREATE POLICY "Company payment periods delete policy" ON public.company_payment_periods
FOR DELETE
TO service_role
USING (is_authenticated_company_user() AND is_company_owner_in_company(company_id));

-- 2. DRIVER_PERIOD_CALCULATIONS - Crítico para cálculos de pago
DROP POLICY IF EXISTS "Driver period calculations select policy" ON public.driver_period_calculations;
CREATE POLICY "Driver period calculations select policy" ON public.driver_period_calculations
FOR SELECT
TO service_role
USING (require_authenticated_user() AND ((( SELECT auth.uid() AS uid) = driver_user_id) OR (company_payment_period_id IN ( SELECT cpp.id
   FROM company_payment_periods cpp
  WHERE (cpp.company_id IN ( SELECT ucr.company_id
           FROM user_company_roles ucr
          WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true))))))));

DROP POLICY IF EXISTS "Driver period calculations update policy" ON public.driver_period_calculations;
CREATE POLICY "Driver period calculations update policy" ON public.driver_period_calculations
FOR UPDATE
TO service_role
USING (require_authenticated_user() AND (company_payment_period_id IN ( SELECT cpp.id
   FROM company_payment_periods cpp
  WHERE (cpp.company_id IN ( SELECT ucr.company_id
           FROM user_company_roles ucr
          WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))))))
WITH CHECK (require_authenticated_user() AND (company_payment_period_id IN ( SELECT cpp.id
   FROM company_payment_periods cpp
  WHERE (cpp.company_id IN ( SELECT ucr.company_id
           FROM user_company_roles ucr
          WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))))));

DROP POLICY IF EXISTS "Driver period calculations delete policy" ON public.driver_period_calculations;
CREATE POLICY "Driver period calculations delete policy" ON public.driver_period_calculations
FOR DELETE
TO service_role
USING (require_authenticated_user() AND (company_payment_period_id IN ( SELECT cpp.id
   FROM company_payment_periods cpp
  WHERE ((cpp.company_id IN ( SELECT ucr.company_id
           FROM user_company_roles ucr
          WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))) AND is_company_owner_in_company(cpp.company_id)))));

-- 3. COMPANY_CLIENTS - Importante para el negocio
DROP POLICY IF EXISTS "Company clients complete policy" ON public.company_clients;
CREATE POLICY "Company clients complete policy" ON public.company_clients
FOR ALL
TO service_role
USING (is_authenticated_company_user() AND (company_id IN ( SELECT ucr.company_id
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))))
WITH CHECK (is_authenticated_company_user() AND (company_id IN ( SELECT ucr.company_id
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))));

-- 4. COMPANY_CLIENT_CONTACTS
DROP POLICY IF EXISTS "Company client contacts complete policy" ON public.company_client_contacts;
CREATE POLICY "Company client contacts complete policy" ON public.company_client_contacts
FOR ALL
TO service_role
USING (is_authenticated_company_user() AND (client_id IN ( SELECT cc.id
   FROM company_clients cc
  WHERE (cc.company_id IN ( SELECT ucr.company_id
           FROM user_company_roles ucr
          WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))))))
WITH CHECK (is_authenticated_company_user() AND (client_id IN ( SELECT cc.id
   FROM company_clients cc
  WHERE (cc.company_id IN ( SELECT ucr.company_id
           FROM user_company_roles ucr
          WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))))));

-- 5. COMPANY_DOCUMENTS
DROP POLICY IF EXISTS "Company documents complete policy" ON public.company_documents;
CREATE POLICY "Company documents complete policy" ON public.company_documents
FOR ALL
TO service_role
USING (is_authenticated_company_user() AND (company_id IN ( SELECT ucr.company_id
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))))
WITH CHECK (is_authenticated_company_user() AND (company_id IN ( SELECT ucr.company_id
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))));

-- 6. DRIVER_PROFILES
DROP POLICY IF EXISTS "Driver profiles complete policy" ON public.driver_profiles;
CREATE POLICY "Driver profiles complete policy" ON public.driver_profiles
FOR ALL
TO service_role
USING (is_authenticated_company_user() AND ((( SELECT auth.uid() AS uid) = user_id) OR (user_id IN ( SELECT ucr.user_id
   FROM user_company_roles ucr
  WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
           FROM user_company_roles ucr2
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true))))))
WITH CHECK (is_authenticated_company_user() AND (( SELECT auth.uid() AS uid) = user_id));