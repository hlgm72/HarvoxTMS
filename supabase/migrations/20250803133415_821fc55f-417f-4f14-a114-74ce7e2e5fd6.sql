-- Eliminar todas las políticas existentes para reconstruirlas optimizadas
DROP POLICY IF EXISTS "Company owners can manage dispatchers" ON public.company_dispatchers;
DROP POLICY IF EXISTS "Operations managers can view dispatchers" ON public.company_dispatchers;
DROP POLICY IF EXISTS "Dispatchers can view their own record" ON public.company_dispatchers;

DROP POLICY IF EXISTS "Company owners can manage dispatcher income" ON public.dispatcher_other_income;
DROP POLICY IF EXISTS "Operations managers can manage dispatcher income" ON public.dispatcher_other_income;
DROP POLICY IF EXISTS "Dispatchers can view their own income" ON public.dispatcher_other_income;

-- Crear políticas optimizadas y consolidadas para company_dispatchers
-- Política única para SELECT que cubre todos los casos
CREATE POLICY "Dispatchers access policy"
ON public.company_dispatchers
FOR SELECT
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  (
    -- Company owners y operations managers pueden ver todos los dispatchers de su empresa
    company_id IN (
      SELECT company_id FROM user_company_roles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role IN ('company_owner', 'operations_manager') 
      AND is_active = true
    )
    OR
    -- Dispatchers pueden ver su propio registro
    user_id = (SELECT auth.uid())
  )
);

-- Política única para INSERT/UPDATE/DELETE (solo para company owners)
CREATE POLICY "Dispatchers management policy"
ON public.company_dispatchers
FOR ALL
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND role = 'company_owner' 
    AND is_active = true
  )
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND role = 'company_owner' 
    AND is_active = true
  )
);

-- Crear políticas optimizadas y consolidadas para dispatcher_other_income
-- Política única para SELECT que cubre todos los casos
CREATE POLICY "Dispatcher income access policy"
ON public.dispatcher_other_income
FOR SELECT
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  (
    -- Company owners y operations managers pueden ver todos los ingresos de su empresa
    company_id IN (
      SELECT company_id FROM user_company_roles 
      WHERE user_id = (SELECT auth.uid()) 
      AND role IN ('company_owner', 'operations_manager') 
      AND is_active = true
    )
    OR
    -- Dispatchers pueden ver sus propios ingresos
    dispatcher_user_id = (SELECT auth.uid())
  )
);

-- Política única para INSERT/UPDATE/DELETE (para company owners y operations managers)
CREATE POLICY "Dispatcher income management policy"
ON public.dispatcher_other_income
FOR ALL
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND role IN ('company_owner', 'operations_manager') 
    AND is_active = true
  )
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false AND
  company_id IN (
    SELECT company_id FROM user_company_roles 
    WHERE user_id = (SELECT auth.uid()) 
    AND role IN ('company_owner', 'operations_manager') 
    AND is_active = true
  )
);