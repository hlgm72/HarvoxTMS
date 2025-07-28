-- Parte 3: Recrear las políticas RLS con la nueva estructura simplificada

CREATE POLICY "Company users can view fuel expenses" ON public.fuel_expenses
FOR SELECT USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  (
    driver_user_id = auth.uid() OR
    payment_period_id IN (
      SELECT cpp.id FROM public.company_payment_periods cpp
      JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

CREATE POLICY "Company admins can insert fuel expenses" ON public.fuel_expenses
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  payment_period_id IN (
    SELECT cpp.id FROM public.company_payment_periods cpp
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
    AND NOT cpp.is_locked
  )
);

CREATE POLICY "Company users can update fuel expenses" ON public.fuel_expenses
FOR UPDATE USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  payment_period_id IN (
    SELECT cpp.id FROM public.company_payment_periods cpp
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
    AND NOT cpp.is_locked
  )
) WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  payment_period_id IN (
    SELECT cpp.id FROM public.company_payment_periods cpp
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.is_active = true
    AND NOT cpp.is_locked
  )
);

CREATE POLICY "Company admins can delete fuel expenses" ON public.fuel_expenses
FOR DELETE USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  (auth.jwt()->>'is_anonymous')::boolean IS FALSE AND
  payment_period_id IN (
    SELECT cpp.id FROM public.company_payment_periods cpp
    JOIN public.user_company_roles ucr ON cpp.company_id = ucr.company_id
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
    AND NOT cpp.is_locked
  )
);