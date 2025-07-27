-- Cuarta ronda corregida: Sin payment_periods
-- Arreglando tablas de conductores, gastos y pagos restantes

-- 1. COMPANY_DRIVERS - Conductores de empresa
DROP POLICY IF EXISTS "Company drivers complete policy" ON public.company_drivers;
CREATE POLICY "Company drivers complete policy" ON public.company_drivers
FOR ALL
TO service_role
USING (is_authenticated_company_user() AND ((( SELECT auth.uid() AS uid) = user_id) OR (user_id IN ( SELECT ucr.user_id
   FROM user_company_roles ucr
  WHERE ((ucr.company_id IN ( SELECT ucr2.company_id
           FROM user_company_roles ucr2
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true))))))
WITH CHECK (is_authenticated_company_user() AND (( SELECT auth.uid() AS uid) = user_id));

-- 2. DRIVER_FUEL_CARDS - Tarjetas de combustible
DROP POLICY IF EXISTS "Driver cards company access policy" ON public.driver_fuel_cards;
CREATE POLICY "Driver cards company access policy" ON public.driver_fuel_cards
FOR SELECT
TO service_role
USING (is_authenticated_company_user() AND (company_id IN ( SELECT ucr.company_id
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))));

DROP POLICY IF EXISTS "Driver cards company update policy" ON public.driver_fuel_cards;
CREATE POLICY "Driver cards company update policy" ON public.driver_fuel_cards
FOR UPDATE
TO service_role
USING (is_authenticated_company_user() AND (EXISTS ( SELECT 1
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.company_id = driver_fuel_cards.company_id) AND (ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role])) AND (ucr.is_active = true)))))
WITH CHECK (is_authenticated_company_user() AND (EXISTS ( SELECT 1
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.company_id = driver_fuel_cards.company_id) AND (ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role])) AND (ucr.is_active = true)))));

DROP POLICY IF EXISTS "Driver cards company delete policy" ON public.driver_fuel_cards;
CREATE POLICY "Driver cards company delete policy" ON public.driver_fuel_cards
FOR DELETE
TO service_role
USING (is_authenticated_company_user() AND (EXISTS ( SELECT 1
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.company_id = driver_fuel_cards.company_id) AND (ucr.role = ANY (ARRAY['company_owner'::user_role, 'operations_manager'::user_role])) AND (ucr.is_active = true)))));

-- 3. EXPENSE_INSTANCES - Instancias de gastos
DROP POLICY IF EXISTS "Users can view expense_instances for their company" ON public.expense_instances;
CREATE POLICY "Users can view expense_instances for their company" ON public.expense_instances
FOR SELECT
TO service_role
USING (require_authenticated_user() AND (payment_period_id IN ( SELECT dpc.id
   FROM ((driver_period_calculations dpc
     JOIN company_payment_periods cpp ON ((dpc.company_payment_period_id = cpp.id)))
     JOIN user_company_roles ucr ON ((cpp.company_id = ucr.company_id)))
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))));

DROP POLICY IF EXISTS "Users can update expense_instances for their company" ON public.expense_instances;
CREATE POLICY "Users can update expense_instances for their company" ON public.expense_instances
FOR UPDATE
TO service_role
USING (require_authenticated_user() AND (payment_period_id IN ( SELECT dpc.id
   FROM ((driver_period_calculations dpc
     JOIN company_payment_periods cpp ON ((dpc.company_payment_period_id = cpp.id)))
     JOIN user_company_roles ucr ON ((cpp.company_id = ucr.company_id)))
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true) AND (ucr.role = ANY (ARRAY['company_owner'::user_role, 'dispatcher'::user_role, 'operations_manager'::user_role]))))))
WITH CHECK (require_authenticated_user() AND (payment_period_id IN ( SELECT dpc.id
   FROM ((driver_period_calculations dpc
     JOIN company_payment_periods cpp ON ((dpc.company_payment_period_id = cpp.id)))
     JOIN user_company_roles ucr ON ((cpp.company_id = ucr.company_id)))
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true) AND (ucr.role = ANY (ARRAY['company_owner'::user_role, 'dispatcher'::user_role, 'operations_manager'::user_role]))))));

DROP POLICY IF EXISTS "Users can delete expense_instances for their company" ON public.expense_instances;
CREATE POLICY "Users can delete expense_instances for their company" ON public.expense_instances
FOR DELETE
TO service_role
USING (require_authenticated_user() AND (payment_period_id IN ( SELECT dpc.id
   FROM ((driver_period_calculations dpc
     JOIN company_payment_periods cpp ON ((dpc.company_payment_period_id = cpp.id)))
     JOIN user_company_roles ucr ON ((cpp.company_id = ucr.company_id)))
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true) AND (ucr.role = ANY (ARRAY['company_owner'::user_role, 'dispatcher'::user_role, 'operations_manager'::user_role]))))));

-- 4. FUEL_LIMITS - Límites de combustible
DROP POLICY IF EXISTS "Fuel limits complete policy" ON public.fuel_limits;
CREATE POLICY "Fuel limits complete policy" ON public.fuel_limits
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
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true)))));

-- 5. PAYMENT_METHODS - Métodos de pago
DROP POLICY IF EXISTS "Payment methods comprehensive policy" ON public.payment_methods;
CREATE POLICY "Payment methods comprehensive policy" ON public.payment_methods
FOR ALL
TO service_role
USING (require_authenticated_user() AND (company_id IN ( SELECT ucr.company_id
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))))
WITH CHECK (require_authenticated_user() AND (company_id IN ( SELECT ucr.company_id
   FROM user_company_roles ucr
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))));

-- 6. PAYMENT_REPORTS - Reportes de pago (corregido para usar driver_period_calculations)
DROP POLICY IF EXISTS "Payment reports comprehensive policy" ON public.payment_reports;
CREATE POLICY "Payment reports comprehensive policy" ON public.payment_reports
FOR ALL
TO service_role
USING (require_authenticated_user() AND (payment_period_id IN ( SELECT dpc.id
   FROM ((driver_period_calculations dpc
     JOIN company_payment_periods cpp ON ((dpc.company_payment_period_id = cpp.id)))
     JOIN user_company_roles ucr ON ((cpp.company_id = ucr.company_id)))
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))))
WITH CHECK (require_authenticated_user() AND (payment_period_id IN ( SELECT dpc.id
   FROM ((driver_period_calculations dpc
     JOIN company_payment_periods cpp ON ((dpc.company_payment_period_id = cpp.id)))
     JOIN user_company_roles ucr ON ((cpp.company_id = ucr.company_id)))
  WHERE ((ucr.user_id = ( SELECT auth.uid() AS uid)) AND (ucr.is_active = true)))));

-- 7. PENDING_EXPENSES - Gastos pendientes
DROP POLICY IF EXISTS "Pending expenses comprehensive policy" ON public.pending_expenses;
CREATE POLICY "Pending expenses comprehensive policy" ON public.pending_expenses
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
          WHERE ((ucr2.user_id = ( SELECT auth.uid() AS uid)) AND (ucr2.is_active = true)))) AND (ucr.is_active = true)))));