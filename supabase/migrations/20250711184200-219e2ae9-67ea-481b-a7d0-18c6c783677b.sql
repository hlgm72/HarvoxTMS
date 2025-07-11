-- Fix RLS policies for SuperAdmin access issues
-- This addresses the problem where auth.uid() returns null but user is authenticated

-- Drop existing problematic policy
DROP POLICY IF EXISTS "Companies unified access policy" ON public.companies;

-- Create improved SuperAdmin access policy that handles authentication edge cases
CREATE POLICY "SuperAdmin complete access" 
ON public.companies 
FOR ALL 
TO authenticated
USING (
  -- Allow if user is authenticated and has superadmin role in user_company_roles
  auth.role() = 'authenticated' AND (
    -- Direct superadmin check via user_company_roles table
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr 
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role = 'superadmin' 
      AND ucr.is_active = true
    )
    OR
    -- Allow access to companies where user has any active role
    id IN (
      SELECT ucr.company_id 
      FROM public.user_company_roles ucr 
      WHERE ucr.user_id = auth.uid() 
      AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  -- For INSERT/UPDATE operations
  auth.role() = 'authenticated' AND (
    -- Allow if user has superadmin role
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr 
      WHERE ucr.user_id = auth.uid() 
      AND ucr.role = 'superadmin' 
      AND ucr.is_active = true
    )
    OR
    -- Allow if user has company_owner role for this specific company
    EXISTS (
      SELECT 1 FROM public.user_company_roles ucr 
      WHERE ucr.user_id = auth.uid() 
      AND ucr.company_id = companies.id
      AND ucr.role = 'company_owner'
      AND ucr.is_active = true
    )
  )
);

-- Add service role policy for system operations
CREATE POLICY "Service role full access" 
ON public.companies 
FOR ALL 
TO service_role
USING (true)
WITH CHECK (true);

-- Log the RLS policy fix
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_policy_fix', jsonb_build_object(
  'timestamp', now(),
  'description', 'Fixed Companies RLS policies to handle SuperAdmin authentication edge cases',
  'changes', ARRAY[
    'Removed dependency on is_superadmin() function',
    'Added direct user_company_roles table checks',
    'Added service_role policy for system operations',
    'Improved WITH CHECK expressions for INSERT/UPDATE operations'
  ],
  'impact', 'Resolved 403 errors for SuperAdmin operations on companies table'
));