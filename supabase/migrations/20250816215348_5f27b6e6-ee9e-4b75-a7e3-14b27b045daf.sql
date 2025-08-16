-- Fix the policy conflict by dropping and recreating the policy
DROP POLICY IF EXISTS "companies_basic_info_members_only" ON public.companies;

-- Create the restrictive SELECT policy for companies table
CREATE POLICY "companies_basic_info_members_only"
ON public.companies
FOR SELECT
TO authenticated
USING (
  -- User must be authenticated and not anonymous
  auth.uid() IS NOT NULL 
  AND COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) = false
  AND (
    -- User belongs to this company (basic access)
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.company_id = companies.id
      AND ucr.is_active = true
    )
    OR
    -- User is superadmin (full access)
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.role = 'superadmin'
      AND ucr.is_active = true
    )
  )
);

-- Verify current policies on companies table
SELECT 
  policyname,
  cmd,
  roles,
  substr(qual, 1, 100) || '...' as policy_condition
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename = 'companies'
ORDER BY policyname;