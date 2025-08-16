-- Fix performance warning: Optimize RLS policy to prevent re-evaluation of auth functions
-- This improves query performance at scale by using subqueries

-- Drop the existing policy
DROP POLICY IF EXISTS "companies_strict_member_access_only" ON companies;

-- Create optimized policy that evaluates auth functions only once per query
CREATE POLICY "companies_strict_member_access_only" 
ON companies 
FOR SELECT 
TO authenticated
USING (
  -- User must be authenticated and not anonymous
  (SELECT auth.uid()) IS NOT NULL 
  AND COALESCE(((SELECT auth.jwt())->>'is_anonymous')::boolean, false) = false
  AND (
    -- User has an active role in this specific company
    id IN (
      SELECT ucr.company_id
      FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
    )
    OR
    -- OR user is a superadmin (verified through active role)
    EXISTS (
      SELECT 1 
      FROM user_company_roles ucr 
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.role = 'superadmin'
      AND ucr.is_active = true
    )
  )
);