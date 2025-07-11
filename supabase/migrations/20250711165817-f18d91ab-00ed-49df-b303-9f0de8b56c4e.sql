-- Final auth.uid() optimization: Fix remaining load_stops, load_documents, and user_invitations policies
-- Replace auth.uid() with (select auth.uid()) in remaining policies

-- Optimize load_stops policies
DROP POLICY IF EXISTS "Company members can manage load stops" ON public.load_stops;
DROP POLICY IF EXISTS "Company members can view load stops" ON public.load_stops;

CREATE POLICY "Company members can manage load stops" 
ON public.load_stops 
FOR ALL 
USING (
  load_id IN (
    SELECT l.id
    FROM (loads l JOIN user_company_roles ucr ON ((l.driver_user_id = ucr.user_id)))
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )
);

CREATE POLICY "Company members can view load stops" 
ON public.load_stops 
FOR SELECT 
USING (
  load_id IN (
    SELECT l.id
    FROM (loads l JOIN user_company_roles ucr ON ((l.driver_user_id = ucr.user_id)))
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )
);

-- Optimize load_documents policies
DROP POLICY IF EXISTS "Company members can manage load documents" ON public.load_documents;
DROP POLICY IF EXISTS "Company members can view load documents" ON public.load_documents;

CREATE POLICY "Company members can manage load documents" 
ON public.load_documents 
FOR ALL 
USING (
  load_id IN (
    SELECT l.id
    FROM (loads l JOIN user_company_roles ucr ON ((l.driver_user_id = ucr.user_id)))
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )
);

CREATE POLICY "Company members can view load documents" 
ON public.load_documents 
FOR SELECT 
USING (
  load_id IN (
    SELECT l.id
    FROM (loads l JOIN user_company_roles ucr ON ((l.driver_user_id = ucr.user_id)))
    WHERE (
      ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE ((user_company_roles.user_id = (select auth.uid())) AND (user_company_roles.is_active = true))
      ) AND 
      (ucr.is_active = true)
    )
  )
);

-- Optimize user_invitations policies
DROP POLICY IF EXISTS "Company owners can view their company invitations" ON public.user_invitations;
CREATE POLICY "Company owners can view their company invitations" 
ON public.user_invitations 
FOR SELECT 
USING (
  company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE (
      (ucr.user_id = (select auth.uid())) AND 
      (ucr.role = ANY (ARRAY['company_owner'::user_role, 'senior_dispatcher'::user_role])) AND 
      (ucr.is_active = true)
    )
  )
);

-- Log completion
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_auth_uid_optimization_final', jsonb_build_object(
  'timestamp', now(),
  'tables_optimized', ARRAY['load_stops', 'load_documents', 'user_invitations'],
  'description', 'Final auth.uid() optimization complete - all remaining auth.uid() performance issues resolved'
));