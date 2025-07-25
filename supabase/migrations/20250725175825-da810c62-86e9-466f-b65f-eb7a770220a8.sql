-- Optimización de políticas RLS para driver_cards
-- Eliminar políticas existentes que causan problemas de rendimiento
DROP POLICY IF EXISTS "Company owners and operations managers can manage cards" ON public.driver_cards;
DROP POLICY IF EXISTS "Users can view cards from their company" ON public.driver_cards;

-- Crear política optimizada unificada para SELECT
-- Optimiza auth.uid() usando (select auth.uid()) para evitar reevaluación por fila
CREATE POLICY "Driver cards company access policy" ON public.driver_cards
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = driver_cards.company_id
    AND ucr.is_active = true
  )
);

-- Crear política optimizada para INSERT
CREATE POLICY "Driver cards company insert policy" ON public.driver_cards
FOR INSERT WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = driver_cards.company_id
    AND ucr.role IN ('company_owner', 'operations_manager')
    AND ucr.is_active = true
  )
);

-- Crear política optimizada para UPDATE
CREATE POLICY "Driver cards company update policy" ON public.driver_cards
FOR UPDATE USING (
  EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = driver_cards.company_id
    AND ucr.role IN ('company_owner', 'operations_manager')
    AND ucr.is_active = true
  )
) WITH CHECK (
  EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = driver_cards.company_id
    AND ucr.role IN ('company_owner', 'operations_manager')
    AND ucr.is_active = true
  )
);

-- Crear política optimizada para DELETE
CREATE POLICY "Driver cards company delete policy" ON public.driver_cards
FOR DELETE USING (
  EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.company_id = driver_cards.company_id
    AND ucr.role IN ('company_owner', 'operations_manager')
    AND ucr.is_active = true
  )
);