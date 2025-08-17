-- Update companies table SELECT policy to be extremely restrictive
-- Force all users to use secure RPC functions instead of direct table access

DROP POLICY IF EXISTS "companies_secure_select_members_only" ON public.companies;

-- Create extremely restrictive SELECT policy - only superadmins can directly access
CREATE POLICY "companies_secure_select_restricted"
ON public.companies
FOR SELECT
TO authenticated
USING (
  -- Only allow superadmins to directly access the companies table
  -- All other users must use secure RPC functions
  (SELECT auth.uid()) IS NOT NULL 
  AND NOT COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false)
  AND user_is_superadmin()
);