-- Eliminar las políticas actuales que causan duplicación
DROP POLICY IF EXISTS "Dispatchers access policy" ON public.company_dispatchers;
DROP POLICY IF EXISTS "Dispatchers management policy" ON public.company_dispatchers;
DROP POLICY IF EXISTS "Dispatcher income access policy" ON public.dispatcher_other_income;
DROP POLICY IF EXISTS "Dispatcher income management policy" ON public.dispatcher_other_income;

-- COMPANY_DISPATCHERS: Crear políticas separadas y específicas
-- Política única y específica para SELECT
CREATE POLICY "Dispatchers select policy"
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

-- Política específica para INSERT
CREATE POLICY "Dispatchers insert policy"
ON public.company_dispatchers
FOR INSERT
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

-- Política específica para UPDATE
CREATE POLICY "Dispatchers update policy"
ON public.company_dispatchers
FOR UPDATE
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

-- Política específica para DELETE
CREATE POLICY "Dispatchers delete policy"
ON public.company_dispatchers
FOR DELETE
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
);

-- DISPATCHER_OTHER_INCOME: Crear políticas separadas y específicas
-- Política única y específica para SELECT
CREATE POLICY "Dispatcher income select policy"
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

-- Política específica para INSERT
CREATE POLICY "Dispatcher income insert policy"
ON public.dispatcher_other_income
FOR INSERT
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

-- Política específica para UPDATE
CREATE POLICY "Dispatcher income update policy"
ON public.dispatcher_other_income
FOR UPDATE
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

-- Política específica para DELETE
CREATE POLICY "Dispatcher income delete policy"
ON public.dispatcher_other_income
FOR DELETE
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
);