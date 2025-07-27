-- Fix infinite recursion in RLS policies by removing problematic require_authenticated_user function
-- and using direct auth.role() checks instead

-- 1. Drop the problematic function that's causing recursion
DROP FUNCTION IF EXISTS public.require_authenticated_user();

-- 2. Update all business table policies to use direct auth.role() = 'authenticated' checks
-- This prevents the infinite recursion issue

-- Companies
DROP POLICY IF EXISTS "SuperAdmin complete access" ON public.companies;
CREATE POLICY "SuperAdmin complete access" ON public.companies
FOR ALL 
TO authenticated
USING (
  (auth.role() = 'authenticated') AND (
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.role = 'superadmin'::user_role AND ucr.is_active = true
    ) OR 
    id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  (auth.role() = 'authenticated') AND (
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.role = 'superadmin'::user_role AND ucr.is_active = true
    ) OR 
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.company_id = companies.id 
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
  (auth.role() = 'authenticated') AND 
  client_id IN (
    SELECT cc.id FROM company_clients cc
    WHERE cc.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  (auth.role() = 'authenticated') AND 
  client_id IN (
    SELECT cc.id FROM company_clients cc
    WHERE cc.company_id IN (
      SELECT ucr.company_id FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
    )
  )
);

-- Company clients
DROP POLICY IF EXISTS "Company clients complete policy" ON public.company_clients;
CREATE POLICY "Company clients complete policy" ON public.company_clients
FOR ALL 
TO authenticated
USING (
  (auth.role() = 'authenticated') AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
)
WITH CHECK (
  (auth.role() = 'authenticated') AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

-- Company documents
DROP POLICY IF EXISTS "Company documents complete policy" ON public.company_documents;
CREATE POLICY "Company documents complete policy" ON public.company_documents
FOR ALL 
TO authenticated
USING (
  (auth.role() = 'authenticated') AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
)
WITH CHECK (
  (auth.role() = 'authenticated') AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

-- Company drivers
DROP POLICY IF EXISTS "Company drivers complete policy" ON public.company_drivers;
CREATE POLICY "Company drivers complete policy" ON public.company_drivers
FOR ALL 
TO authenticated
USING (
  (auth.role() = 'authenticated') AND (
    auth.uid() = user_id OR 
    user_id IN (
      SELECT ucr.user_id FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT ucr2.company_id FROM user_company_roles ucr2
        WHERE ucr2.user_id = auth.uid() AND ucr2.is_active = true
      ) AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  (auth.role() = 'authenticated') AND auth.uid() = user_id
);

-- Company equipment
DROP POLICY IF EXISTS "Company equipment access policy" ON public.company_equipment;
CREATE POLICY "Company equipment access policy" ON public.company_equipment
FOR ALL 
TO authenticated
USING (
  (auth.role() = 'authenticated') AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
)
WITH CHECK (
  (auth.role() = 'authenticated') AND 
  company_id IN (
    SELECT ucr.company_id FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid() AND ucr.is_active = true
  )
);

-- Fix user_company_roles - this was causing the recursion
DROP POLICY IF EXISTS "Optimized role management policy" ON public.user_company_roles;
CREATE POLICY "Optimized role management policy" ON public.user_company_roles
FOR ALL 
TO authenticated
USING (
  (auth.role() = 'authenticated') AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_company_roles ucr_check
      WHERE ucr_check.user_id = auth.uid() 
      AND ucr_check.company_id = user_company_roles.company_id
      AND ucr_check.role = ANY (ARRAY['company_owner'::user_role, 'superadmin'::user_role])
      AND ucr_check.is_active = true
    )
  )
)
WITH CHECK (
  (auth.role() = 'authenticated') AND (
    auth.uid() = user_id OR
    EXISTS (
      SELECT 1 FROM user_company_roles ucr_check
      WHERE ucr_check.user_id = auth.uid() 
      AND ucr_check.company_id = user_company_roles.company_id
      AND ucr_check.role = ANY (ARRAY['company_owner'::user_role, 'superadmin'::user_role])
      AND ucr_check.is_active = true
    )
  )
);

-- Fix profiles to be more restrictive
DROP POLICY IF EXISTS "Profiles admin and user access" ON public.profiles;
CREATE POLICY "Profiles admin and user access" ON public.profiles
FOR ALL 
TO authenticated
USING (
  (auth.role() = 'authenticated') AND (
    auth.uid() = id OR
    EXISTS (
      SELECT 1 FROM user_company_roles ucr
      WHERE ucr.user_id = auth.uid()
      AND ucr.role = 'superadmin'::user_role
      AND ucr.is_active = true
    )
  )
)
WITH CHECK (
  (auth.role() = 'authenticated') AND auth.uid() = id
);

-- Fix system tables to be superadmin only
DROP POLICY IF EXISTS "Superadmins can view audit logs" ON public.security_audit_log;
CREATE POLICY "Superadmins can view audit logs" ON public.security_audit_log
FOR SELECT 
TO authenticated
USING (
  (auth.role() = 'authenticated') AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.role = 'superadmin'::user_role
    AND ucr.is_active = true
  )
);

DROP POLICY IF EXISTS "System stats comprehensive access" ON public.system_stats;
CREATE POLICY "System stats comprehensive access" ON public.system_stats
FOR ALL 
TO authenticated
USING (
  (auth.role() = 'authenticated') AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.role = 'superadmin'::user_role
    AND ucr.is_active = true
  )
)
WITH CHECK (
  (auth.role() = 'authenticated') AND
  EXISTS (
    SELECT 1 FROM user_company_roles ucr
    WHERE ucr.user_id = auth.uid()
    AND ucr.role = 'superadmin'::user_role
    AND ucr.is_active = true
  )
);