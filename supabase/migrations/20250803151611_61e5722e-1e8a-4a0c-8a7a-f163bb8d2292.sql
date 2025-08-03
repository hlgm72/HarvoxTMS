-- Fix archive_logs RLS performance issue
-- Optimize the auth function calls

-- Drop the existing policy
DROP POLICY IF EXISTS "Company admins can view archive logs" ON public.archive_logs;

-- Create optimized policy for archive_logs
CREATE POLICY "Optimized archive logs access policy" 
ON public.archive_logs 
FOR ALL
USING (
  -- Optimize auth.uid() and auth.jwt() calls by wrapping in SELECT
  (SELECT auth.uid()) IS NOT NULL AND 
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  -- Must be a company admin (company_owner, operations_manager, or superadmin)
  EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
)
WITH CHECK (
  -- Same optimized conditions for INSERT/UPDATE
  (SELECT auth.uid()) IS NOT NULL AND 
  ((SELECT auth.jwt())->>'is_anonymous')::boolean IS FALSE AND
  EXISTS (
    SELECT 1
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) 
    AND ucr.role IN ('company_owner', 'operations_manager', 'superadmin')
    AND ucr.is_active = true
  )
);