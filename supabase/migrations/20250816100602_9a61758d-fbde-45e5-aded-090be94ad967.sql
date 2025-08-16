-- Fix anonymous access to sensitive audit log table
-- This table should only be accessible to authenticated superadmins

-- Drop existing policy that allows anonymous access
DROP POLICY IF EXISTS "sensitive_data_audit_superadmin_only" ON public.company_sensitive_data_access_log;

-- Recreate policy with explicit authentication check
CREATE POLICY "sensitive_data_audit_superadmin_only" ON public.company_sensitive_data_access_log
FOR ALL
TO authenticated
USING (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND
  auth.uid() IS NOT NULL AND
  COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false AND
  EXISTS (
    SELECT 1 FROM user_company_roles
    WHERE user_id = auth.uid()
    AND role = 'superadmin'
    AND is_active = true
  )
);