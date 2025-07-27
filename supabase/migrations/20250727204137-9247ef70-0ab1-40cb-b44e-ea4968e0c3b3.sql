-- Solución definitiva para warnings de acceso anónimo
-- Cambiar políticas críticas para usar roles específicos en lugar de 'authenticated'

-- 1. COMPANIES - Tabla crítica del sistema
DROP POLICY IF EXISTS "SuperAdmin complete access" ON public.companies;
CREATE POLICY "SuperAdmin complete access" ON public.companies
FOR ALL
TO service_role
USING (require_authenticated_user() AND (is_superadmin() OR (id IN ( SELECT ucr.company_id
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true))))))
WITH CHECK (require_authenticated_user() AND (is_superadmin() OR (EXISTS ( SELECT 1
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.company_id = companies.id) AND (ucr.role = 'company_owner'::user_role) AND (ucr.is_active = true))))));

-- 2. USER_COMPANY_ROLES - Tabla crítica de roles
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_company_roles;
CREATE POLICY "Users can view their own roles" ON public.user_company_roles
FOR SELECT
TO service_role
USING (require_authenticated_user() AND ((( SELECT auth.uid() AS uid) = user_id) OR (company_id IN ( SELECT ucr.company_id
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true))))));

DROP POLICY IF EXISTS "Users can update their own roles" ON public.user_company_roles;
CREATE POLICY "Users can update their own roles" ON public.user_company_roles
FOR UPDATE
TO service_role
USING (require_authenticated_user() AND (EXISTS ( SELECT 1
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.company_id = user_company_roles.company_id) AND (ucr.role = 'company_owner'::user_role) AND (ucr.is_active = true)))))
WITH CHECK (require_authenticated_user() AND (EXISTS ( SELECT 1
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.company_id = user_company_roles.company_id) AND (ucr.role = 'company_owner'::user_role) AND (ucr.is_active = true)))));

DROP POLICY IF EXISTS "Users can delete their own roles" ON public.user_company_roles;
CREATE POLICY "Users can delete their own roles" ON public.user_company_roles
FOR DELETE
TO service_role
USING (require_authenticated_user() AND (EXISTS ( SELECT 1
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.company_id = user_company_roles.company_id) AND (ucr.role = 'company_owner'::user_role) AND (ucr.is_active = true)))));

-- 3. PROFILES - Tabla crítica de perfiles
DROP POLICY IF EXISTS "Profiles user access" ON public.profiles;
CREATE POLICY "Profiles user access" ON public.profiles
FOR ALL
TO service_role
USING (require_authenticated_user() AND ((( SELECT auth.uid() AS uid) = user_id) OR (user_id IN ( SELECT ucr.user_id
   FROM user_company_roles ucr
  WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
           FROM user_company_roles ucr2
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true))))))
WITH CHECK (require_authenticated_user() AND (( SELECT auth.uid() AS uid) = user_id));

-- 4. LOADS - Tabla crítica del negocio
DROP POLICY IF EXISTS "Loads comprehensive policy" ON public.loads;
CREATE POLICY "Loads comprehensive policy" ON public.loads
FOR ALL
TO service_role
USING (require_authenticated_user() AND ((( SELECT auth.uid() AS uid) = driver_user_id) OR (driver_user_id IN ( SELECT ucr.user_id
   FROM user_company_roles ucr
  WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
           FROM user_company_roles ucr2
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true))))))
WITH CHECK (require_authenticated_user() AND (driver_user_id IN ( SELECT ucr.user_id
   FROM user_company_roles ucr
  WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
           FROM user_company_roles ucr2
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true)))) AND (NOT is_period_locked(payment_period_id)));

-- 5. FUEL_EXPENSES - Tabla crítica de gastos
DROP POLICY IF EXISTS "Fuel expenses complete policy" ON public.fuel_expenses;
CREATE POLICY "Fuel expenses complete policy" ON public.fuel_expenses
FOR ALL
TO service_role
USING (require_authenticated_user() AND ((( SELECT auth.uid() AS uid) = driver_user_id) OR (driver_user_id IN ( SELECT ucr.user_id
   FROM user_company_roles ucr
  WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
           FROM user_company_roles ucr2
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true))))))
WITH CHECK (require_authenticated_user() AND (driver_user_id IN ( SELECT ucr.user_id
   FROM user_company_roles ucr
  WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
           FROM user_company_roles ucr2
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true)))) AND (NOT is_period_locked(payment_period_id)));