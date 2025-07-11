-- Final cleanup of remaining multiple permissive RLS policies

-- 1. Fix company_broker_dispatchers table
DROP POLICY IF EXISTS "Company broker dispatchers unified policy" ON public.company_broker_dispatchers;
DROP POLICY IF EXISTS "Service role can manage broker dispatchers" ON public.company_broker_dispatchers;

CREATE POLICY "Company broker dispatchers complete policy" ON public.company_broker_dispatchers
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access dispatchers from brokers in their company
  (auth.role() = 'authenticated' AND broker_id IN (
    SELECT cb.id
    FROM company_brokers cb
    JOIN user_company_roles ucr ON cb.company_id = ucr.company_id
    WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
  ))
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can manage dispatchers from brokers in their company
  (auth.role() = 'authenticated' AND broker_id IN (
    SELECT cb.id
    FROM company_brokers cb
    JOIN user_company_roles ucr ON cb.company_id = ucr.company_id
    WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
  ))
);

-- 2. Fix company_brokers table
DROP POLICY IF EXISTS "Company brokers unified policy" ON public.company_brokers;
DROP POLICY IF EXISTS "Service role can manage company brokers" ON public.company_brokers;

CREATE POLICY "Company brokers complete policy" ON public.company_brokers
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access brokers in their company (excluding superadmin)
  (auth.role() = 'authenticated' AND NOT is_superadmin() AND company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) 
    AND ucr.is_active = true 
    AND ucr.company_id IN (SELECT id FROM get_real_companies())
  ))
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can manage brokers in their company
  (auth.role() = 'authenticated' AND company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
  ))
);

-- 3. Fix company_documents table
DROP POLICY IF EXISTS "Company documents unified policy" ON public.company_documents;
DROP POLICY IF EXISTS "Service role can manage all company documents" ON public.company_documents;

CREATE POLICY "Company documents complete policy" ON public.company_documents
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access documents in their company
  (auth.role() = 'authenticated' AND company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
  ))
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can manage documents in their company
  (auth.role() = 'authenticated' AND company_id IN (
    SELECT ucr.company_id
    FROM user_company_roles ucr
    WHERE ucr.user_id = (select auth.uid()) AND ucr.is_active = true
  ))
);

-- 4. Fix company_drivers table
DROP POLICY IF EXISTS "Company drivers unified policy" ON public.company_drivers;
DROP POLICY IF EXISTS "Service role can manage all company drivers" ON public.company_drivers;

CREATE POLICY "Company drivers complete policy" ON public.company_drivers
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access their own profile or profiles in their company
  (auth.role() = 'authenticated' AND (
    (select auth.uid()) = user_id
    OR
    (NOT is_superadmin() AND user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE user_company_roles.user_id = (select auth.uid()) 
        AND user_company_roles.is_active = true 
        AND user_company_roles.company_id IN (SELECT id FROM get_real_companies())
      ) AND ucr.is_active = true
    ))
  ))
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can only manage their own profile
  (auth.role() = 'authenticated' AND (select auth.uid()) = user_id)
);

-- 5. Fix driver_profiles table (remove existing policies)
DROP POLICY IF EXISTS "Driver profiles unified policy" ON public.driver_profiles;
DROP POLICY IF EXISTS "Service role can manage all driver profiles" ON public.driver_profiles;

CREATE POLICY "Driver profiles complete policy" ON public.driver_profiles
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access their own profile or profiles in their company
  (auth.role() = 'authenticated' AND (
    (select auth.uid()) = user_id
    OR
    (NOT is_superadmin() AND user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE user_company_roles.user_id = (select auth.uid()) 
        AND user_company_roles.is_active = true 
        AND user_company_roles.company_id IN (SELECT id FROM get_real_companies())
      ) AND ucr.is_active = true
    ))
  ))
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can only manage their own profile
  (auth.role() = 'authenticated' AND (select auth.uid()) = user_id)
);

-- 6. Fix owner_operators table (consolidate all existing policies)
DROP POLICY IF EXISTS "Owner operators access" ON public.owner_operators;
DROP POLICY IF EXISTS "Service role can manage all owner operators" ON public.owner_operators;
DROP POLICY IF EXISTS "Users and company members can access owner operator profiles" ON public.owner_operators;

CREATE POLICY "Owner operators complete policy" ON public.owner_operators
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access their own profile or profiles in their company
  (auth.role() = 'authenticated' AND (
    (select auth.uid()) = user_id
    OR
    user_id IN (
      SELECT ucr.user_id
      FROM user_company_roles ucr
      WHERE ucr.company_id IN (
        SELECT user_company_roles.company_id
        FROM user_company_roles
        WHERE user_company_roles.user_id = (select auth.uid()) 
        AND user_company_roles.is_active = true
      ) AND ucr.is_active = true
    )
  ))
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can only manage their own profile
  (auth.role() = 'authenticated' AND (select auth.uid()) = user_id)
);

-- Update final statistics
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_policies_final_cleanup_complete', jsonb_build_object(
  'timestamp', now(),
  'description', 'Final cleanup of all remaining multiple permissive RLS policies',
  'tables_fixed', ARRAY['company_broker_dispatchers', 'company_brokers', 'company_documents', 'company_drivers', 'driver_profiles', 'owner_operators'],
  'approach', 'consolidated_single_policies_per_table',
  'all_multiple_permissive_warnings_resolved', true
));