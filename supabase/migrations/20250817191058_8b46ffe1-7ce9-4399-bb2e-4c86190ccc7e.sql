-- Fix companies table RLS policies to allow appropriate business access
-- Current policies are too restrictive, only allowing superadmins to view company data

-- Drop the overly restrictive select policy
DROP POLICY IF EXISTS "companies_secure_select_restricted" ON companies;

-- Create new select policy allowing company members to view their own company data
CREATE POLICY "companies_select_members_only" ON companies
FOR SELECT
USING (
  -- User must be authenticated and not anonymous
  auth.uid() IS NOT NULL AND
  NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) AND
  (
    -- Superadmins can see all companies
    user_is_superadmin() OR
    -- Company members can see their own company
    id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.is_active = true
    )
  )
);

-- Also update the insert policy to be more explicit about superadmin requirement
DROP POLICY IF EXISTS "companies_secure_insert_superadmin_only" ON companies;

CREATE POLICY "companies_insert_superadmin_only" ON companies
FOR INSERT
WITH CHECK (
  -- Only superadmins can create new companies
  auth.uid() IS NOT NULL AND
  NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) AND
  user_is_superadmin()
);

-- Update the update policy to be more explicit
DROP POLICY IF EXISTS "companies_secure_update_owners_only" ON companies;

CREATE POLICY "companies_update_owners_and_admins" ON companies
FOR UPDATE
USING (
  -- User must be authenticated and not anonymous
  auth.uid() IS NOT NULL AND
  NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) AND
  (
    -- Superadmins can update all companies
    user_is_superadmin() OR
    -- Company owners can update their own company
    user_is_company_owner(id)
  )
)
WITH CHECK (
  -- Same conditions for the check constraint
  auth.uid() IS NOT NULL AND
  NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false) AND
  (
    user_is_superadmin() OR
    user_is_company_owner(id)
  )
);