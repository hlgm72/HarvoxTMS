-- Fix owner_operators table security (corrected for actual table structure)
-- This table doesn't have company_id, so we use user_id based access only

-- 5. Secure owner_operators table (corrected)
ALTER TABLE owner_operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "owner_operators_user_access_only"
ON owner_operators
FOR ALL
TO authenticated
USING (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
    -- Owner-operators can only see their own data
    user_id = (SELECT auth.uid())
    OR
    -- Superadmins can see all owner-operator data
    EXISTS (
      SELECT 1
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
      AND ucr.role = 'superadmin'
    )
  )
)
WITH CHECK (
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
    -- Owner-operators can only update their own data
    user_id = (SELECT auth.uid())
    OR
    -- Superadmins can update all owner-operator data
    EXISTS (
      SELECT 1
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
      AND ucr.role = 'superadmin'
    )
  )
);