-- Optimize RLS policy to prevent re-evaluation of auth.jwt() per row
DROP POLICY IF EXISTS "data_fix_audit_superadmin_only" ON public.data_fix_audit;

CREATE POLICY "data_fix_audit_superadmin_only" 
ON public.data_fix_audit 
AS RESTRICTIVE
FOR ALL 
TO authenticated
USING (
  -- Block anonymous users (optimize with SELECT to prevent re-evaluation)
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS DISTINCT FROM true
  AND EXISTS (
    SELECT 1 
    FROM public.user_company_roles 
    WHERE user_id = (SELECT auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
);