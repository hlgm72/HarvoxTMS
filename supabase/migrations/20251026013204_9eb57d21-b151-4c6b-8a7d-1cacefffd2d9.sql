-- Optimize RLS policy for facilities table to prevent re-evaluation of auth functions
-- Wrap auth functions with SELECT to evaluate only once per query instead of per row

-- Drop existing policy
DROP POLICY IF EXISTS "Facilities company access" ON facilities;

-- Recreate optimized policy
CREATE POLICY "Facilities company access"
ON facilities
FOR ALL
TO authenticated
USING (
  ((SELECT auth.uid()) IS NOT NULL) 
  AND (NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false))
  AND (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
  ))
)
WITH CHECK (
  ((SELECT auth.uid()) IS NOT NULL) 
  AND (NOT COALESCE(((SELECT auth.jwt()) ->> 'is_anonymous'::text)::boolean, false))
  AND (company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.is_active = true
  ))
);