-- Drop the current DELETE policy with performance issues
DROP POLICY IF EXISTS "Users can delete load documents from their company loads" ON public.load_documents;

-- Create an optimized DELETE policy using (select auth.uid()) for better performance
CREATE POLICY "Users can delete load documents from their company loads"
ON public.load_documents
FOR DELETE
TO public
USING (
  require_authenticated_user() 
  AND load_id IN (
    SELECT l.id
    FROM loads l
    WHERE (
      l.driver_user_id = (select auth.uid()) 
      OR l.driver_user_id IN (
        SELECT ucr.user_id
        FROM user_company_roles ucr
        WHERE ucr.company_id IN (
          SELECT ucr2.company_id
          FROM user_company_roles ucr2
          WHERE ucr2.user_id = (select auth.uid()) 
          AND ucr2.is_active = true
        )
        AND ucr.is_active = true
      )
    )
  )
);