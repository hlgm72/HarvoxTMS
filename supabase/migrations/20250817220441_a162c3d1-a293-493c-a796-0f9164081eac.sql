-- Drop all existing policies for load_documents
DROP POLICY IF EXISTS "Users can delete load documents from their company loads" ON public.load_documents;
DROP POLICY IF EXISTS "Users can insert load documents for their company loads" ON public.load_documents;
DROP POLICY IF EXISTS "Users can update load documents from their company loads" ON public.load_documents;
DROP POLICY IF EXISTS "Users can view load documents from their company loads" ON public.load_documents;

-- Create extremely strict policies that explicitly block anonymous users
CREATE POLICY "Users can view load documents from their company loads"
ON public.load_documents
FOR SELECT
TO authenticated
USING (
  (select auth.role()) = 'authenticated' 
  AND (select auth.uid()) IS NOT NULL 
  AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
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

CREATE POLICY "Users can insert load documents for their company loads"
ON public.load_documents
FOR INSERT
TO authenticated
WITH CHECK (
  (select auth.role()) = 'authenticated' 
  AND (select auth.uid()) IS NOT NULL 
  AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
  AND load_id IN (
    SELECT l.id
    FROM loads l
    WHERE EXISTS (
      SELECT 1
      FROM user_company_roles ucr1
      WHERE ucr1.user_id = (select auth.uid())
      AND ucr1.is_active = true
      AND ucr1.company_id IN (
        SELECT ucr2.company_id
        FROM user_company_roles ucr2
        WHERE (
          l.driver_user_id = ucr2.user_id 
          OR l.created_by = ucr2.user_id 
          OR ucr2.user_id = (select auth.uid())
        )
        AND ucr2.is_active = true
      )
    )
  )
);

CREATE POLICY "Users can update load documents from their company loads"
ON public.load_documents
FOR UPDATE
TO authenticated
USING (
  (select auth.role()) = 'authenticated' 
  AND (select auth.uid()) IS NOT NULL 
  AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
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
)
WITH CHECK (
  (select auth.role()) = 'authenticated' 
  AND (select auth.uid()) IS NOT NULL 
  AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
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

CREATE POLICY "Users can delete load documents from their company loads"
ON public.load_documents
FOR DELETE
TO authenticated
USING (
  (select auth.role()) = 'authenticated' 
  AND (select auth.uid()) IS NOT NULL 
  AND COALESCE(((select auth.jwt()) ->> 'is_anonymous')::boolean, false) = false
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