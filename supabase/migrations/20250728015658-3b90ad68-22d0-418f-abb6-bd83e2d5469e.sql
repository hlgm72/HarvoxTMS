-- Actualizar la política de inserción para fuel_expenses
DROP POLICY IF EXISTS "Fuel expenses complete policy" ON public.fuel_expenses;

-- Crear política de lectura
CREATE POLICY "Company users can view fuel expenses" 
ON public.fuel_expenses 
FOR SELECT 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  (
    -- El usuario es el conductor
    driver_user_id = (SELECT auth.uid()) OR
    -- O está en la misma empresa que el conductor
    driver_user_id IN (
      SELECT ucr.user_id
      FROM public.user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM public.user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid())
        AND ucr2.is_active = true
      )
      AND ucr.is_active = true
    )
  )
);

-- Crear política de inserción más permisiva para importación
CREATE POLICY "Company admins can insert fuel expenses" 
ON public.fuel_expenses 
FOR INSERT 
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  (
    -- El usuario está en la misma empresa que el conductor
    driver_user_id IN (
      SELECT ucr.user_id
      FROM public.user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id
        FROM public.user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid())
        AND ucr2.is_active = true
      )
      AND ucr.is_active = true
    ) AND
    -- Y el período no está bloqueado (si se proporciona)
    (payment_period_id IS NULL OR NOT is_period_locked(payment_period_id))
  )
);

-- Crear política de actualización
CREATE POLICY "Company users can update fuel expenses" 
ON public.fuel_expenses 
FOR UPDATE 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  driver_user_id IN (
    SELECT ucr.user_id
    FROM public.user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id
      FROM public.user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid())
      AND ucr2.is_active = true
    )
    AND ucr.is_active = true
  ) AND
  (payment_period_id IS NULL OR NOT is_period_locked(payment_period_id))
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  driver_user_id IN (
    SELECT ucr.user_id
    FROM public.user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id
      FROM public.user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid())
      AND ucr2.is_active = true
    )
    AND ucr.is_active = true
  ) AND
  (payment_period_id IS NULL OR NOT is_period_locked(payment_period_id))
);

-- Crear política de eliminación
CREATE POLICY "Company admins can delete fuel expenses" 
ON public.fuel_expenses 
FOR DELETE 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  driver_user_id IN (
    SELECT ucr.user_id
    FROM public.user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT ucr2.company_id
      FROM public.user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid())
      AND ucr2.role IN ('company_owner', 'operations_manager', 'superadmin')
      AND ucr2.is_active = true
    )
    AND ucr.is_active = true
  )
);