-- Fix RLS policy to block anonymous users explicitly
DROP POLICY IF EXISTS "data_fix_audit_superadmin_only" ON public.data_fix_audit;

CREATE POLICY "data_fix_audit_superadmin_only" 
ON public.data_fix_audit 
FOR ALL 
USING (
  (SELECT auth.uid()) IS NOT NULL
  AND EXISTS (
    SELECT 1 
    FROM public.user_company_roles 
    WHERE user_id = (SELECT auth.uid())
    AND role = 'superadmin'
    AND is_active = true
  )
);