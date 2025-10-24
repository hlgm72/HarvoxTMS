-- Fix RLS policy to explicitly target authenticated users only
DROP POLICY IF EXISTS "data_fix_audit_superadmin_only" ON public.data_fix_audit;

CREATE POLICY "data_fix_audit_superadmin_only" 
ON public.data_fix_audit 
AS RESTRICTIVE
FOR ALL 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_company_roles 
    WHERE user_id = (SELECT auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
);