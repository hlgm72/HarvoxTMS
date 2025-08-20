-- Fix Anonymous Access Warning for Companies Table
-- Update DELETE policy to explicitly exclude anonymous users

-- Drop the current DELETE policy
DROP POLICY IF EXISTS "companies_ultra_secure_delete_prohibited" ON companies;

-- Recreate with explicit anonymous user exclusion
CREATE POLICY "companies_ultra_secure_delete_prohibited"
ON companies FOR DELETE
TO authenticated
USING (
  false 
  AND auth.uid() IS NOT NULL 
  AND NOT COALESCE((auth.jwt()->>'is_anonymous')::boolean, false)
);