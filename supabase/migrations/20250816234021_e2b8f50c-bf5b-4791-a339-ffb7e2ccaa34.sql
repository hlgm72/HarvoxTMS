-- Fix the RLS policy performance issue by using SELECT statements for auth functions

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Users can insert load documents for their company loads" ON public.load_documents;

-- Create optimized INSERT policy with proper auth function caching
CREATE POLICY "Users can insert load documents for their company loads"
ON public.load_documents
FOR INSERT
TO public
WITH CHECK (
  -- Must be authenticated
  (SELECT auth.role()) = 'authenticated' AND
  (SELECT auth.uid()) IS NOT NULL AND
  -- The load_id must be for a load the user has access to
  EXISTS (
    SELECT 1
    FROM loads l
    JOIN user_company_roles ucr ON ucr.company_id IN (
      SELECT ucr2.company_id
      FROM user_company_roles ucr2
      WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
    )
    WHERE l.id = load_id
    AND ucr.is_active = true
    AND (
      l.driver_user_id = ucr.user_id OR 
      l.created_by = ucr.user_id OR
      ucr.user_id = (SELECT auth.uid())
    )
  )
);