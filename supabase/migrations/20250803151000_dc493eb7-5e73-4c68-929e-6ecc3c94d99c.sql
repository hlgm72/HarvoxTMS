-- Fix 2: Remove anonymous access from archive_logs RLS policy

-- Drop the existing policy that allows anonymous access
DROP POLICY IF EXISTS "Company admins can view archive logs" ON public.archive_logs;

-- Create a new policy that explicitly requires authentication and proper roles
CREATE POLICY "Company admins can view archive logs" 
ON public.archive_logs 
FOR ALL
USING (
  -- Require authenticated non-anonymous user
  auth.uid() IS NOT NULL AND 
  ((auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  -- Must be a company admin (company_owner, operations_manager, or superadmin)
  EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
)
WITH CHECK (
  -- Same conditions for INSERT/UPDATE
  auth.uid() IS NOT NULL AND 
  ((auth.jwt()->>'is_anonymous')::boolean) IS FALSE AND
  EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() 
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
);