-- Fix RLS performance issues for load_documents table
-- Replace auth.uid() with (select auth.uid()) to avoid re-evaluation per row

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view load documents from their company loads" ON public.load_documents;
DROP POLICY IF EXISTS "Users can insert load documents for their company loads" ON public.load_documents;
DROP POLICY IF EXISTS "Users can update load documents from their company loads" ON public.load_documents;
DROP POLICY IF EXISTS "Users can delete load documents from their company loads" ON public.load_documents;

-- Create optimized policies with (select auth.uid())
CREATE POLICY "Users can view load documents from their company loads" 
ON public.load_documents 
FOR SELECT 
USING (
  (auth.role() = 'service_role'::text) OR 
  (
    (auth.role() = 'authenticated'::text) AND 
    (load_id IN ( 
      SELECT l.id
      FROM (loads l
        JOIN user_company_roles ucr ON (((l.driver_user_id = ucr.user_id) OR (l.created_by = ucr.user_id))))
      WHERE ((ucr.company_id IN ( 
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      )) AND (ucr.is_active = true))
    ))
  )
);

CREATE POLICY "Users can insert load documents for their company loads" 
ON public.load_documents 
FOR INSERT 
WITH CHECK (
  (auth.role() = 'service_role'::text) OR 
  (
    (auth.role() = 'authenticated'::text) AND 
    (load_id IN ( 
      SELECT l.id
      FROM (loads l
        JOIN user_company_roles ucr ON (((l.driver_user_id = ucr.user_id) OR (l.created_by = ucr.user_id))))
      WHERE ((ucr.company_id IN ( 
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      )) AND (ucr.is_active = true))
    ))
  )
);

CREATE POLICY "Users can update load documents from their company loads" 
ON public.load_documents 
FOR UPDATE 
USING (
  (auth.role() = 'service_role'::text) OR 
  (
    (auth.role() = 'authenticated'::text) AND 
    (load_id IN ( 
      SELECT l.id
      FROM (loads l
        JOIN user_company_roles ucr ON (((l.driver_user_id = ucr.user_id) OR (l.created_by = ucr.user_id))))
      WHERE ((ucr.company_id IN ( 
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      )) AND (ucr.is_active = true))
    ))
  )
)
WITH CHECK (
  (auth.role() = 'service_role'::text) OR 
  (
    (auth.role() = 'authenticated'::text) AND 
    (load_id IN ( 
      SELECT l.id
      FROM (loads l
        JOIN user_company_roles ucr ON (((l.driver_user_id = ucr.user_id) OR (l.created_by = ucr.user_id))))
      WHERE ((ucr.company_id IN ( 
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      )) AND (ucr.is_active = true))
    ))
  )
);

CREATE POLICY "Users can delete load documents from their company loads" 
ON public.load_documents 
FOR DELETE 
USING (
  (auth.role() = 'service_role'::text) OR 
  (
    (auth.role() = 'authenticated'::text) AND 
    (load_id IN ( 
      SELECT l.id
      FROM (loads l
        JOIN user_company_roles ucr ON (((l.driver_user_id = ucr.user_id) OR (l.created_by = ucr.user_id))))
      WHERE ((ucr.company_id IN ( 
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      )) AND (ucr.is_active = true))
    ))
  )
);