-- Fix anonymous user access in user_company_roles RLS policies
-- The current policies don't explicitly block anonymous users

DROP POLICY IF EXISTS "user_company_roles_select_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_update_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_delete_policy" ON public.user_company_roles;
DROP POLICY IF EXISTS "user_company_roles_insert_policy" ON public.user_company_roles;

-- Create policies that explicitly deny anonymous users
CREATE POLICY "user_company_roles_select_policy" 
ON public.user_company_roles 
FOR SELECT 
USING (
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND 
  (SELECT (auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  (
    -- Users can see their own roles
    user_id = (SELECT auth.uid()) OR
    -- Or roles within their company if they have admin access
    (company_id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.is_active = true
      AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    )) OR
    -- Or superadmin can see all
    (EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.role = 'superadmin' 
      AND ucr.is_active = true
    ))
  )
);

CREATE POLICY "user_company_roles_insert_policy" 
ON public.user_company_roles 
FOR INSERT 
WITH CHECK (
  ((SELECT auth.role()) = 'service_role') OR 
  (
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
      (EXISTS (
        SELECT 1 FROM user_company_roles ucr
        WHERE ucr.user_id = (SELECT auth.uid()) 
        AND ucr.role = 'superadmin' 
        AND ucr.is_active = true
      ))
    )
  )
);

CREATE POLICY "user_company_roles_update_policy" 
ON public.user_company_roles 
FOR UPDATE 
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
    (EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.role = 'superadmin' 
      AND ucr.is_active = true
    ))
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
    (EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.role = 'superadmin' 
      AND ucr.is_active = true
    ))
  )
);

CREATE POLICY "user_company_roles_delete_policy" 
ON public.user_company_roles 
FOR DELETE 
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
    (EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.role = 'superadmin' 
      AND ucr.is_active = true
    ) AND NOT (user_id = (SELECT auth.uid()) AND role = 'superadmin'))
  )
);