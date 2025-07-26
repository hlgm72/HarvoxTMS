-- Fix auth RLS performance issue in user_company_roles table
-- Replace auth.uid() with (select auth.uid()) to prevent re-evaluation per row

DROP POLICY IF EXISTS "Optimized role management policy" ON public.user_company_roles;

CREATE POLICY "Optimized role management policy" ON public.user_company_roles
FOR ALL
TO authenticated
USING (
  (SELECT auth.role()) = 'service_role'::text OR 
  (
    (SELECT auth.role()) = 'authenticated'::text AND (
      -- SuperAdmins can see everything
      is_superadmin((SELECT auth.uid())) OR
      -- Users can see their own roles
      user_id = (SELECT auth.uid()) OR
      -- Company members can see roles within their companies
      (
        NOT is_superadmin((SELECT auth.uid())) AND
        company_id IN (
          SELECT get_user_company_roles.company_id
          FROM get_user_company_roles((SELECT auth.uid())) get_user_company_roles(company_id, role)
        )
      )
    )
  )
)
WITH CHECK (
  (SELECT auth.role()) = 'service_role'::text OR 
  (
    (SELECT auth.role()) = 'authenticated'::text AND (
      -- SuperAdmins can manage any role
      is_superadmin((SELECT auth.uid())) OR
      -- Company owners can manage roles in their company (except superadmin role)
      (
        company_id IN (
          SELECT ucr.company_id 
          FROM user_company_roles ucr 
          WHERE ucr.user_id = (SELECT auth.uid()) 
          AND ucr.role = 'company_owner' 
          AND ucr.is_active = true
        ) AND
        role != 'superadmin'
      ) OR
      -- Users can only insert their own initial roles when invited
      (
        user_id = (SELECT auth.uid()) AND
        role != 'superadmin' AND
        NOT EXISTS (
          SELECT 1 FROM user_company_roles existing 
          WHERE existing.user_id = (SELECT auth.uid()) 
          AND existing.company_id = user_company_roles.company_id
        )
      )
    )
  )
);