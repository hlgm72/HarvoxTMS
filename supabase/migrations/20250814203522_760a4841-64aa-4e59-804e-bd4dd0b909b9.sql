-- Fix security vulnerabilities in companies table RLS policies

-- First, remove the overly permissive service role policies
DROP POLICY IF EXISTS "Service role companies access" ON public.companies;
DROP POLICY IF EXISTS "Service role full access" ON public.companies;

-- Fix the INSERT policy to be more restrictive
DROP POLICY IF EXISTS "Consolidated companies insert policy" ON public.companies;
CREATE POLICY "Companies insert for superadmins only" 
ON public.companies 
FOR INSERT 
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false 
  AND is_user_superadmin_safe(auth.uid())
);

-- Strengthen the DELETE policy  
DROP POLICY IF EXISTS "Consolidated companies delete policy" ON public.companies;
CREATE POLICY "Companies delete for superadmins only" 
ON public.companies 
FOR DELETE 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false 
  AND is_user_superadmin_safe(auth.uid())
);

-- Ensure SELECT policy is properly restrictive
DROP POLICY IF EXISTS "Companies select policy" ON public.companies;
CREATE POLICY "Companies select for company members only" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false 
  AND (
    -- User has active role in this company
    id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() 
      AND ucr.is_active = true
    )
    -- OR user is superadmin
    OR is_user_superadmin_safe(auth.uid())
  )
);

-- Keep the UPDATE policy as it's already secure
-- No changes needed for "Company admins can update companies"

-- Add a more secure service role policy only for specific operations
CREATE POLICY "Service role limited access" 
ON public.companies 
FOR ALL 
TO service_role
USING (
  -- Only allow service role access for system operations
  current_setting('app.service_operation', true) = 'allowed'
)
WITH CHECK (
  current_setting('app.service_operation', true) = 'allowed'
);

-- Create a function to safely enable service role operations when needed
CREATE OR REPLACE FUNCTION public.enable_service_operation()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT set_config('app.service_operation', 'allowed', true);
$$;

-- Create a function to disable service role operations
CREATE OR REPLACE FUNCTION public.disable_service_operation()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT set_config('app.service_operation', 'disabled', true);
$$;