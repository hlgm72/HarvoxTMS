-- SOLUCIÓN DEFINITIVA: Verificaciones explícitas que el linter puede detectar
-- Solo modificamos las tablas que podemos controlar (public schema)

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Company payment periods select policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods insert policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods update policy" ON public.company_payment_periods;
DROP POLICY IF EXISTS "Company payment periods delete policy" ON public.company_payment_periods;

DROP POLICY IF EXISTS "user_company_roles_select_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_insert_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_update_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_delete_policy" ON public.user_company_roles;

-- COMPANY_PAYMENT_PERIODS: Políticas con verificaciones explícitas contra usuarios anónimos
CREATE POLICY "Company payment periods select policy" 
ON public.company_payment_periods 
FOR SELECT 
TO authenticated 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  ))
);

CREATE POLICY "Company payment periods insert policy" 
ON public.company_payment_periods 
FOR INSERT 
TO authenticated
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
    AND ucr.role IN ('company_owner', 'operations_manager')
  )
);

CREATE POLICY "Company payment periods update policy" 
ON public.company_payment_periods 
FOR UPDATE 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  ))
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.is_active = true
  ))
);

CREATE POLICY "Company payment periods delete policy" 
ON public.company_payment_periods 
FOR DELETE 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  is_company_owner_in_company(company_id)
);

-- USER_COMPANY_ROLES: Políticas con verificaciones explícitas contra usuarios anónimos
-- Usar subqueries para evitar recursión
CREATE POLICY "user_company_roles_select_policy" 
ON public.user_company_roles 
FOR SELECT 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  (
    -- Users can see their own roles
    user_id = (SELECT auth.uid()) OR
    -- Or superadmin can see all
    (SELECT auth.uid()) IN (
      SELECT ucr.user_id 
      FROM user_company_roles ucr 
      WHERE ucr.role = 'superadmin' 
      AND ucr.is_active = true
    ) OR
    -- Or company admins can see roles in their companies
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager')
    )
  )
);

CREATE POLICY "user_company_roles_insert_policy" 
ON public.user_company_roles 
FOR INSERT 
TO authenticated
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  (
    -- Company owners can assign roles in their company
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true
      AND ucr.role = 'company_owner'
    ) OR
    -- Superadmin can assign any role
    (SELECT auth.uid()) IN (
      SELECT ucr.user_id 
      FROM user_company_roles ucr 
      WHERE ucr.role = 'superadmin' 
      AND ucr.is_active = true
    )
  )
);

CREATE POLICY "user_company_roles_update_policy" 
ON public.user_company_roles 
FOR UPDATE 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  (
    -- Company owners can update roles in their company
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true
      AND ucr.role = 'company_owner'
    ) OR
    -- Superadmin can update any role
    (SELECT auth.uid()) IN (
      SELECT ucr.user_id 
      FROM user_company_roles ucr 
      WHERE ucr.role = 'superadmin' 
      AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  (
    -- Company owners can update roles in their company
    company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true
      AND ucr.role = 'company_owner'
    ) OR
    -- Superadmin can update any role
    (SELECT auth.uid()) IN (
      SELECT ucr.user_id 
      FROM user_company_roles ucr 
      WHERE ucr.role = 'superadmin' 
      AND ucr.is_active = true
    )
  )
);

CREATE POLICY "user_company_roles_delete_policy" 
ON public.user_company_roles 
FOR DELETE 
TO authenticated
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  (
    -- Company owners can delete roles in their company (except their own company_owner role)
    (company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true
      AND ucr.role = 'company_owner'
    ) AND NOT (user_id = (SELECT auth.uid()) AND role = 'company_owner')) OR
    -- Superadmin can delete any role (except their own superadmin role)
    ((SELECT auth.uid()) IN (
      SELECT ucr.user_id 
      FROM user_company_roles ucr 
      WHERE ucr.role = 'superadmin' 
      AND ucr.is_active = true
    ) AND NOT (user_id = (SELECT auth.uid()) AND role = 'superadmin'))
  )
);