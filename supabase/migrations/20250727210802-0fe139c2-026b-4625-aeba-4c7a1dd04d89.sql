-- Continue fixing RLS performance warnings: Part 2

-- 4. Fix maintenance_types policy
DROP POLICY IF EXISTS "Maintenance types read access" ON public.maintenance_types;
CREATE POLICY "Maintenance types read access" 
ON public.maintenance_types 
FOR SELECT TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = (select auth.uid()) AND is_active = true
  )
);

-- 5. Fix security_audit_log policy
DROP POLICY IF EXISTS "Superadmins can view audit logs" ON public.security_audit_log;
CREATE POLICY "Superadmins can view audit logs" 
ON public.security_audit_log 
FOR SELECT TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  is_superadmin((select auth.uid()))
);

-- 6. Fix user_invitations policies
DROP POLICY IF EXISTS "Users can view their invitations" ON public.user_invitations;
CREATE POLICY "Users can view their invitations" 
ON public.user_invitations 
FOR SELECT TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  email IN (
    SELECT up.email 
    FROM auth.users up 
    WHERE up.id = (select auth.uid())
  )
);

DROP POLICY IF EXISTS "Users can accept their invitations" ON public.user_invitations;
CREATE POLICY "Users can accept their invitations" 
ON public.user_invitations 
FOR UPDATE TO authenticated
USING (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  email IN (
    SELECT up.email 
    FROM auth.users up 
    WHERE up.id = (select auth.uid())
  )
)
WITH CHECK (
  (select auth.uid()) IS NOT NULL AND 
  ((select auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  email IN (
    SELECT up.email 
    FROM auth.users up 
    WHERE up.id = (select auth.uid())
  )
);