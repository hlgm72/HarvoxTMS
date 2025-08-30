-- Forzar la eliminación de todas las políticas loads_select y crear la optimizada
DROP POLICY IF EXISTS "loads_select_access_optimized" ON public.loads;
DROP POLICY IF EXISTS "loads_select_access_fixed" ON public.loads;
DROP POLICY IF EXISTS "loads_select_access" ON public.loads;

-- Crear la política optimizada para rendimiento
CREATE POLICY "loads_select_access_optimized" 
ON public.loads 
FOR SELECT 
USING (
  -- Usuario autenticado y no anónimo (optimizado)
  (SELECT auth.role()) = 'authenticated' 
  AND (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
    -- Es el conductor de la carga
    driver_user_id = (SELECT auth.uid()) 
    OR 
    -- Es el creador de una carga sin conductor asignado
    (driver_user_id IS NULL AND created_by = (SELECT auth.uid()))
    OR
    -- La carga pertenece a un período de su empresa
    payment_period_id IN (
      SELECT cpp.id
      FROM company_payment_periods cpp
      JOIN user_company_roles ucr ON cpp.company_id = ucr.company_id
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true
    )
    OR
    -- Cargas sin período asignado creadas por usuarios de su empresa
    (
      payment_period_id IS NULL 
      AND (
        -- Es su propia carga
        created_by = (SELECT auth.uid())
        OR 
        -- Es una carga de un conductor de su empresa
        driver_user_id IN (
          SELECT ucr1.user_id 
          FROM user_company_roles ucr1
          JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
          WHERE ucr2.user_id = (SELECT auth.uid()) 
          AND ucr1.is_active = true 
          AND ucr2.is_active = true
        )
        OR
        -- Es una carga creada por alguien de su empresa
        created_by IN (
          SELECT ucr1.user_id 
          FROM user_company_roles ucr1
          JOIN user_company_roles ucr2 ON ucr1.company_id = ucr2.company_id
          WHERE ucr2.user_id = (SELECT auth.uid()) 
          AND ucr1.is_active = true 
          AND ucr2.is_active = true
        )
      )
    )
  )
);