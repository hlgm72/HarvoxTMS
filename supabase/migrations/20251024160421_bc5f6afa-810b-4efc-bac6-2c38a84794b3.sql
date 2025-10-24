-- Optimize RLS policy for data_fix_audit table
-- Replace auth.uid() with (select auth.uid()) to prevent re-evaluation per row

DROP POLICY IF EXISTS "data_fix_audit_superadmin_only" ON public.data_fix_audit;

CREATE POLICY "data_fix_audit_superadmin_only" 
ON public.data_fix_audit 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.user_company_roles 
    WHERE user_id = (SELECT auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
);