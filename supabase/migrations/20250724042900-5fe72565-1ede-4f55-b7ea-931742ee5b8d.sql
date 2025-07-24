-- Fix ALL auth function calls in load_documents RLS policies
-- Wrap both auth.role() and auth.uid() with (select ...) to avoid re-evaluation per row

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view load documents from their company loads" ON public.load_documents;
DROP POLICY IF EXISTS "Users can insert load documents for their company loads" ON public.load_documents;
DROP POLICY IF EXISTS "Users can update load documents from their company loads" ON public.load_documents;
DROP POLICY IF EXISTS "Users can delete load documents from their company loads" ON public.load_documents;

-- Create fully optimized policies with all auth functions wrapped
CREATE POLICY "Users can view load documents from their company loads" 
ON public.load_documents 
FOR SELECT 
USING (
  ((select auth.role()) = 'service_role'::text) OR 
  (
    ((select auth.role()) = 'authenticated'::text) AND 
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
  ((select auth.role()) = 'service_role'::text) OR 
  (
    ((select auth.role()) = 'authenticated'::text) AND 
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
  ((select auth.role()) = 'service_role'::text) OR 
  (
    ((select auth.role()) = 'authenticated'::text) AND 
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
  ((select auth.role()) = 'service_role'::text) OR 
  (
    ((select auth.role()) = 'authenticated'::text) AND 
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
  ((select auth.role()) = 'service_role'::text) OR 
  (
    ((select auth.role()) = 'authenticated'::text) AND 
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