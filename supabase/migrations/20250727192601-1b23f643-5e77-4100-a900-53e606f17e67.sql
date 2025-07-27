-- Fix anonymous access policies by restricting sensitive tables to authenticated users only
-- Keep reference data (cities, states, etc.) public as intended
-- Skip cron schema tables as they are system tables

-- 1. Update require_authenticated_user function to be more strict
CREATE OR REPLACE FUNCTION public.require_authenticated_user()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE 
    WHEN auth.role() = 'authenticated' AND auth.uid() IS NOT NULL THEN true
    ELSE false
  END;
$$;

-- 2. Fix sensitive business tables to require strict authentication

-- Companies - should only be accessible to authenticated users
DROP POLICY IF EXISTS "SuperAdmin complete access" ON public.companies;
CREATE POLICY "SuperAdmin complete access" ON public.companies
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.role = 'superadmin'::user_role AND ucr.is_active = true
    ) OR 
    id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND (
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.role = 'superadmin'::user_role AND ucr.is_active = true
    ) OR 
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.company_id = companies.id 
      AND ucr.role = 'company_owner'::user_role AND ucr.is_active = true
    )
  )
);

-- Company client contacts
DROP POLICY IF EXISTS "Company client contacts complete policy" ON public.company_client_contacts;
CREATE POLICY "Company client contacts complete policy" ON public.company_client_contacts
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND 
  client_id IN (
    SELECT cc.id FROM company_clients cc
    WHERE cc.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  client_id IN (
    SELECT cc.id FROM company_clients cc
    WHERE cc.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
);

-- Company clients
DROP POLICY IF EXISTS "Company clients complete policy" ON public.company_clients;
CREATE POLICY "Company clients complete policy" ON public.company_clients
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

-- Company documents
DROP POLICY IF EXISTS "Company documents complete policy" ON public.company_documents;
CREATE POLICY "Company documents complete policy" ON public.company_documents
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

-- Company drivers
DROP POLICY IF EXISTS "Company drivers complete policy" ON public.company_drivers;
CREATE POLICY "Company drivers complete policy" ON public.company_drivers
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    (SELECT auth.uid()) = user_id OR 
    user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = (SELECT auth.uid()) AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND (SELECT auth.uid()) = user_id
);

-- Company equipment
DROP POLICY IF EXISTS "Company equipment access policy" ON public.company_equipment;
CREATE POLICY "Company equipment access policy" ON public.company_equipment
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
  )
);

-- Fix user_company_roles to be more restrictive
DROP POLICY IF EXISTS "Optimized role management policy" ON public.user_company_roles;
CREATE POLICY "Optimized role management policy" ON public.user_company_roles
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    (SELECT auth.uid()) = user_id OR
    company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND (
    (SELECT auth.uid()) = user_id OR
    company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid()) 
      AND ucr.role = ANY (ARRAY['company_owner'::user_role, 'superadmin'::user_role])
      AND ucr.is_active = true
    )
  )
);

-- Fix profiles to be more restrictive
DROP POLICY IF EXISTS "Profiles admin and user access" ON public.profiles;
CREATE POLICY "Profiles admin and user access" ON public.profiles
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND (
    (SELECT auth.uid()) = id OR
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = (SELECT auth.uid())
      AND ucr.role = 'superadmin'::user_role
      AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  require_authenticated_user() AND (SELECT auth.uid()) = id
);

-- Keep reference data tables public but optimize them
-- These tables SHOULD remain accessible to anonymous users
-- US Cities, States, Counties, ZIP codes are reference data

-- For system tables like security_audit_log, make them superadmin only
DROP POLICY IF EXISTS "Superadmins can view audit logs" ON public.security_audit_log;
CREATE POLICY "Superadmins can view audit logs" ON public.security_audit_log
FOR SELECT 
TO authenticated
USING (
  require_authenticated_user() AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.role = 'superadmin'::user_role
    AND ucr.is_active = true
  )
);

-- Fix system_stats to be superadmin only
DROP POLICY IF EXISTS "System stats comprehensive access" ON public.system_stats;
CREATE POLICY "System stats comprehensive access" ON public.system_stats
FOR ALL 
TO authenticated
USING (
  require_authenticated_user() AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.role = 'superadmin'::user_role
    AND ucr.is_active = true
  )
)
WITH CHECK (
  require_authenticated_user() AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = (SELECT auth.uid())
    AND ucr.role = 'superadmin'::user_role
    AND ucr.is_active = true
  )
);