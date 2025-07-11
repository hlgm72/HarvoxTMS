-- Comprehensive fix for ALL multiple permissive RLS policies
-- This addresses the root cause by consolidating authenticated and service role policies

-- 1. Fix all remaining tables with a systematic approach
-- Drop ALL existing policies and recreate with single comprehensive policies

-- Load Documents Table
DROP POLICY IF EXISTS "Company members can manage load documents" ON public.load_documents;
DROP POLICY IF EXISTS "Company members can view load documents" ON public.load_documents;
DROP POLICY IF EXISTS "Service role can manage load documents" ON public.load_documents;

CREATE POLICY "Load documents comprehensive policy" ON public.load_documents
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access loads in their company
  (auth.role() = 'authenticated' AND load_id IN (
    SELECT l.id
    FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can manage loads in their company
  (auth.role() = 'authenticated' AND load_id IN (
    SELECT l.id
    FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
);

-- Load Stops Table
DROP POLICY IF EXISTS "Company members can manage load stops" ON public.load_stops;
DROP POLICY IF EXISTS "Company members can view load stops" ON public.load_stops;
DROP POLICY IF EXISTS "Service role can manage load stops" ON public.load_stops;

CREATE POLICY "Load stops comprehensive policy" ON public.load_stops
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access load stops in their company
  (auth.role() = 'authenticated' AND load_id IN (
    SELECT l.id
    FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
)
WITH CHECK (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can manage load stops in their company
  (auth.role() = 'authenticated' AND load_id IN (
    SELECT l.id
    FROM loads l
    JOIN user_company_roles ucr ON l.driver_user_id = ucr.user_id
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
);

-- Loads Table
DROP POLICY IF EXISTS "Company members can manage company loads" ON public.loads;
DROP POLICY IF EXISTS "Company members can view company loads" ON public.loads;
DROP POLICY IF EXISTS "Drivers can view their own loads" ON public.loads;
DROP POLICY IF EXISTS "Service role can manage loads" ON public.loads;

CREATE POLICY "Loads comprehensive policy" ON public.loads
FOR ALL
USING (
  -- Service role has full access
  auth.role() = 'service_role'
  OR
  -- Authenticated users can access their own loads or company loads
  (auth.role() = 'authenticated' AND (
    -- Users can view their own loads
    (select auth.uid()) = driver_user_id
    OR
    -- Company members can view loads in their company (excluding superadmin)
    (NOT is_superadmin() AND driver_user_id IN (
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
  -- Authenticated users can manage loads in their company
  (auth.role() = 'authenticated' AND driver_user_id IN (
    SELECT ucr.user_id
    FROM user_company_roles ucr
    WHERE ucr.company_id IN (
      SELECT user_company_roles.company_id
      FROM user_company_roles
      WHERE user_company_roles.user_id = (select auth.uid()) 
      AND user_company_roles.is_active = true
    ) AND ucr.is_active = true
  ))
);

-- Update statistics
INSERT INTO public.system_stats (stat_type, stat_value)
VALUES ('rls_policies_comprehensive_fix', jsonb_build_object(
  'timestamp', now(),
  'description', 'Comprehensive consolidation of all multiple permissive RLS policies into single policies',
  'tables_fixed', ARRAY['load_documents', 'load_stops', 'loads'],
  'approach', 'unified_policies_with_role_check',
  'multiple_policies_eliminated', true
));